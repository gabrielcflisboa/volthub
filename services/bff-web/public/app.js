// VoltHub SPA — sem framework. Login OAuth2 Authorization Code + PKCE feito "na unha" (ver auth abaixo).

const $ = (id) => document.getElementById(id);
const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const kwh = (n) => `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWh`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_PT = { AVAILABLE: 'Livre', RESERVED: 'Reservado', CHARGING: 'Carregando', FAULTED: 'Com falha', OFFLINE: 'Offline',
  CONFIRMED: 'Confirmada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada', EXPIRED: 'Expirada' };
const pill = (s) => `<span class="pill ${esc(s)}">${esc(STATUS_PT[s] ?? s)}</span>`;

function toast(msg, bad = false) {
  const el = document.createElement('div');
  el.className = `toast${bad ? ' bad' : ''}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ─────────────────────────── Autenticação (PKCE) ───────────────────────────
const cfg = await (await fetch('/config.json')).json();
const oidc = `${cfg.keycloakUrl}/realms/${cfg.realm}/protocol/openid-connect`;
const redirectUri = `${location.origin}/`;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function login() {
  // 1. code_verifier fica SÓ no navegador; 2. vai para o Keycloak apenas o hash (code_challenge)
  const verifier = randomString(48);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomString(16);
  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('pkce_state', state);
  const params = new URLSearchParams({
    client_id: cfg.clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid',
    code_challenge: challenge, code_challenge_method: 'S256', state,
  });
  location.assign(`${oidc}/auth?${params}`);
}

async function exchangeCode(code, state) {
  if (state !== sessionStorage.getItem('pkce_state')) throw new Error('state não confere (possível CSRF)');
  // 3. Troca o code pelo token mandando o verifier: um code interceptado, sem o verifier, não vale nada
  const res = await fetch(`${oidc}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: cfg.clientId,
      code_verifier: sessionStorage.getItem('pkce_verifier'),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao trocar o code: ${res.status}`);
  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('pkce_state');
  saveTokens(await res.json());
}

let tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
function saveTokens(t) {
  tokens = { ...t, expires_at: Date.now() + t.expires_in * 1000 };
  sessionStorage.setItem('tokens', JSON.stringify(tokens));
}

async function accessToken() {
  if (!tokens) return null;
  if (Date.now() > tokens.expires_at - 30_000) {
    const res = await fetch(`${oidc}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: cfg.clientId }),
    });
    if (!res.ok) { logout(); return null; }
    saveTokens(await res.json());
  }
  return tokens.access_token;
}

function logout() {
  const idToken = tokens?.id_token;
  sessionStorage.clear();
  const params = new URLSearchParams({ client_id: cfg.clientId, post_logout_redirect_uri: redirectUri, ...(idToken ? { id_token_hint: idToken } : {}) });
  location.assign(`${oidc}/logout?${params}`);
}

function claims() {
  const payload = tokens.access_token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

// ─────────────────────────── API (sempre via BFF) ───────────────────────────
async function api(path, method = 'GET') {
  const res = await fetch(path, { method, headers: { authorization: `Bearer ${await accessToken()}` } });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail ?? body?.title ?? `Erro ${res.status}`);
  return body;
}

async function apiPost(path, data) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail ?? body?.title ?? `Erro ${res.status}`);
  return body;
}

// ─────────────────────────── Motorista ───────────────────────────
const live = { sessionId: null, energyKwh: 0, powerKw: 0 };
let dashboard = null;

async function loadDriver() {
  dashboard = await api('/api/v1/dashboard');
  const deg = dashboard.degraded ?? [];
  $('degraded').classList.toggle('hidden', deg.length === 0);
  $('degraded').textContent = deg.length ? `Funcionando parcialmente: ${deg.join(', ')} fora do ar. O restante da tela continua disponível.` : '';
  renderStations();
  renderActive();
  renderInvoices();
}

function renderStations() {
  const busy = !!dashboard.activeReservation;
  $('stations').innerHTML = dashboard.stations.map((s) => `
    <div class="card station">
      <h3>${esc(s.name)}</h3>
      <div class="meta">${esc(s.address)} · ${brl(s.pricePerKwh)}/kWh · ${s.availableChargers} livre(s)</div>
      ${s.chargers.map((c) => `
        <div class="charger">
          <div class="spec"><b>${esc(c.chargerId)}</b> <small>${esc(c.connector)} · ${c.powerKw} kW</small></div>
          <div class="row" style="margin:0">
            ${pill(c.status)}
            ${c.status === 'AVAILABLE' ? `<button class="primary" data-reserve="${esc(c.chargerId)}" ${busy ? 'disabled' : ''}>Reservar</button>` : ''}
          </div>
        </div>`).join('')}
    </div>`).join('') || '<div class="card muted">Nenhuma estação disponível.</div>';
}

function renderActive() {
  const r = dashboard.activeReservation;
  if (!r) {
    $('active').innerHTML = '<p class="muted">Nenhuma reserva ativa. Escolha um carregador livre ao lado.</p>';
    return;
  }
  const station = dashboard.stations.find((s) => s.id === r.stationId);
  const price = station?.pricePerKwh ?? 0;
  if (r.status === 'IN_PROGRESS') {
    const e = live.sessionId === r.sessionId ? live.energyKwh : Number(r.energyKwh);
    $('active').innerHTML = `
      ${pill(r.status)} <span class="live">● ao vivo</span>
      <div class="big">${kwh(e)}</div>
      <div class="muted">${live.powerKw ? `${live.powerKw} kW agora · ` : ''}estimado ${brl(e * price)}</div>
      <div class="bar"><span style="width:${Math.min(100, (e / 40) * 100)}%"></span></div>
      <dl class="kv"><dt>Carregador</dt><dd>${esc(r.chargerId)}</dd><dt>Sessão</dt><dd>${esc(r.sessionId)}</dd></dl>`;
    return;
  }
  const mins = Math.max(0, Math.round((new Date(r.expiresAt) - Date.now()) / 60000));
  $('active').innerHTML = `
    ${pill(r.status)}
    <dl class="kv" style="margin-top:10px">
      <dt>Carregador</dt><dd>${esc(r.chargerId)}</dd>
      <dt>Estação</dt><dd>${esc(station?.name ?? r.stationId)}</dd>
      <dt>Expira em</dt><dd>${mins} min</dd>
    </dl>
    <div class="row">
      <button class="primary" data-start="${esc(r.id)}" ${r.startRequested ? 'disabled' : ''}>${r.startRequested ? 'Aguardando o carregador…' : 'Cheguei, iniciar recarga'}</button>
      <button class="danger" data-cancel="${esc(r.id)}">Cancelar</button>
    </div>`;
}

function renderInvoices() {
  const inv = dashboard.invoices;
  $('invoices').innerHTML = inv.length
    ? `<table><tr><th>Carregador</th><th class="num">Energia</th><th class="num">Valor</th></tr>
        ${inv.slice(0, 8).map((i) => `<tr><td>${esc(i.chargerId)}</td><td class="num">${kwh(i.energyKwh)}</td><td class="num">${brl(i.amount)}</td></tr>`).join('')}</table>`
    : '<p class="muted">Sem faturas ainda.</p>';
}

document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  try {
    if (t.dataset.reserve) {
      t.disabled = true;
      await apiPost('/api/v1/reservations', { chargerId: t.dataset.reserve });
      toast(`Reserva confirmada em ${t.dataset.reserve}`);
    } else if (t.dataset.start) {
      t.disabled = true;
      await apiPost(`/api/v1/reservations/${t.dataset.start}/start`);
      toast('Comando enviado ao carregador');
    } else if (t.dataset.cancel) {
      await apiPost(`/api/v1/reservations/${t.dataset.cancel}/cancel`);
      toast('Reserva cancelada');
    } else if (t.dataset.fault) {
      await apiPost(`/api/v1/admin/chargers/${t.dataset.fault}/fault`);
      toast(`Falha simulada em ${t.dataset.fault}`, true);
    } else if (t.dataset.repair) {
      await apiPost(`/api/v1/admin/chargers/${t.dataset.repair}/repair`);
      toast(`${t.dataset.repair} reparado`);
    } else if (t.id === 'btn-logout') {
      logout();
      return;
    }
  } catch (e) {
    toast(e.message, true);
  }
  refreshSoon();
});

// ─────────────────────────── Operador ───────────────────────────
async function loadOperator() {
  const o = await api('/api/v1/admin/overview');
  $('degraded').classList.toggle('hidden', !o.degraded);
  $('degraded').textContent = o.degraded ? 'Algum serviço não respondeu; dados parciais.' : '';
  $('op-stations').innerHTML = `<table>
    <tr><th>Estação</th><th>Carregador</th><th>Potência</th><th>Status</th><th>Reserva ativa</th><th></th></tr>
    ${o.stations.flatMap((s) => s.chargers.map((c) => `<tr>
      <td>${esc(s.name)}</td><td><b>${esc(c.chargerId)}</b></td><td>${c.powerKw} kW</td><td>${pill(c.status)}</td>
      <td><small>${esc(c.activeReservationId ?? '—')}</small></td>
      <td>${c.status === 'FAULTED' ? `<button data-repair="${esc(c.chargerId)}">Reparar</button>` : `<button class="danger" data-fault="${esc(c.chargerId)}">Simular falha</button>`}</td>
    </tr>`)).join('')}</table>`;
  $('op-report').innerHTML = o.report.length
    ? `<table><tr><th>Estação</th><th class="num">Sessões</th><th class="num">Energia</th><th class="num">Receita</th></tr>
      ${o.report.map((r) => `<tr><td>${esc(r.station_id)}</td><td class="num">${r.sessions}</td><td class="num">${kwh(r.energy_kwh)}</td><td class="num">${brl(r.revenue)}</td></tr>`).join('')}</table>`
    : '<p class="muted">Sem faturamento ainda.</p>';
  $('op-resilience').innerHTML = `<table><tr><th>Serviço</th><th>Circuito</th><th class="num">Falhas</th><th class="num">Rejeitadas</th></tr>
    ${o.resilience.map((r) => `<tr><td>${esc(r.service)}</td><td>${esc(r.state)}</td><td class="num">${r.stats.failures}</td><td class="num">${r.stats.rejects}</td></tr>`).join('')}</table>`;
  $('op-invoices').innerHTML = o.invoices.length
    ? `<table><tr><th>Quando</th><th>Carregador</th><th class="num">Energia</th><th class="num">Preço</th><th class="num">Valor</th></tr>
      ${o.invoices.slice(0, 15).map((i) => `<tr><td>${new Date(i.issuedAt).toLocaleTimeString('pt-BR')}</td><td>${esc(i.chargerId)}</td><td class="num">${kwh(i.energyKwh)}</td><td class="num">${brl(i.pricePerKwh)}</td><td class="num">${brl(i.amount)}</td></tr>`).join('')}</table>`
    : '<p class="muted">Nenhuma fatura.</p>';
}

// ─────────────────────────── Tempo real ───────────────────────────
let refreshTimer = null;
function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(load, 400);
}

async function connectWs() {
  const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/ws?access_token=${encodeURIComponent(await accessToken())}`);
  ws.onmessage = (m) => {
    const e = JSON.parse(m.data);
    switch (e.type) {
      case 'meter':
        if (isOperator) return;
        live.sessionId = e.sessionId; live.energyKwh = e.energyKwh; live.powerKw = e.powerKw;
        if (dashboard?.activeReservation?.status === 'IN_PROGRESS') renderActive();
        return;
      case 'session-started': toast('Recarga iniciada!'); break;
      case 'invoice': toast(`Fatura: ${kwh(e.energyKwh)} · ${brl(e.amount)}`); break;
      case 'reservation':
        if (e.event === 'reservation.cancelled' && e.reason === 'CHARGER_FAULT') toast('O carregador apresentou falha e sua reserva foi cancelada. Escolha outro.', true);
        if (e.event === 'reservation.expired') toast('Sua reserva expirou.', true);
        break;
    }
    refreshSoon();
  };
  ws.onclose = () => setTimeout(connectWs, 3000);
}

// ─────────────────────────── Inicialização ───────────────────────────
let isOperator = false;
async function load() {
  try {
    if (isOperator) await loadOperator(); else await loadDriver();
  } catch (e) {
    toast(e.message, true);
  }
}

const url = new URL(location.href);
if (url.searchParams.get('code')) {
  try {
    await exchangeCode(url.searchParams.get('code'), url.searchParams.get('state'));
  } catch (e) {
    toast(e.message, true);
  }
  history.replaceState(null, '', '/');
}

if (!tokens) {
  $('login').classList.remove('hidden');
  $('btn-login').onclick = login;
} else {
  const c = claims();
  isOperator = (c.realm_access?.roles ?? []).includes('operator');
  $('user').innerHTML = `<span>${esc(c.name ?? c.email)} · ${isOperator ? 'Operador' : 'Motorista'}</span><button id="btn-logout">Sair</button>`;
  $(isOperator ? 'operator' : 'driver').classList.remove('hidden');
  await load();
  connectWs();
  setInterval(() => { if (!isOperator && dashboard?.activeReservation?.status === 'CONFIRMED') renderActive(); }, 30_000);
}
