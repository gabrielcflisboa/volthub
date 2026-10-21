import { create } from 'zustand';
import { env } from '@/core/config/env';
import { Invoice } from '@/domain/entities/Invoice';
import { apiClient } from '@/infrastructure/api/apiClient';
import { HttpDashboardRepository } from '@/infrastructure/repositories/HttpDashboardRepository';
import { GetDriverDashboardUseCase } from '@/application/use-cases/GetDriverDashboardUseCase';
import { useAuthStore } from './useAuthStore';

const dashboardRepository = new HttpDashboardRepository();
const getDriverDashboardUseCase = new GetDriverDashboardUseCase(dashboardRepository);

export interface CompletedInvoice {
  stationName: string;
  chargerId: string;
  energyKwh: number;
  pricePerKwh: number;
  totalAmount: number;
  elapsedSeconds: number;
  issuedAt: string;
}

export interface LiveSessionState {
  isCharging: boolean;
  stationName: string;
  chargerId: string;
  reservationId: string | null;
  powerKw: number;
  energyKwh: number;
  targetKwh: number;
  batteryPercent: number;
  pricePerKwh: number;
  elapsedSeconds: number;
  wsConnected: boolean;
  lastInvoice: CompletedInvoice | null;
  invoiceHistory: Invoice[];
  degradedServices: string[];

  // Actions
  startCharging: (stationName: string, chargerId: string, powerKw: number, pricePerKwh: number) => Promise<void>;
  stopCharging: () => Promise<void>;
  clearInvoice: () => void;
  fetchDashboardInvoices: () => Promise<void>;
  updateTelemetry: (powerKw: number, energyKwh: number) => void;
}

let timer: ReturnType<typeof setInterval> | null = null;
let ws: WebSocket | null = null;
let lastWsMeterAt = 0;

const INITIAL_SOC = 20; // Começa em 20% de bateria
const TARGET_KWH = 48.0; // 48 kWh para ir de 20% a 100% (bateria de 60 kWh)

const computeBatteryPercent = (energyKwh: number, targetKwh: number): number => {
  const pct = INITIAL_SOC + (energyKwh / targetKwh) * (100 - INITIAL_SOC);
  return Math.min(100, Math.round(pct));
};

export const useLiveChargingStore = create<LiveSessionState>((set, get) => ({
  isCharging: false,
  stationName: 'VoltHub Diamond Lourdes',
  chargerId: 'BH-LOU-01',
  reservationId: null,
  powerKw: 148.5,
  energyKwh: 0.0,
  targetKwh: TARGET_KWH,
  batteryPercent: INITIAL_SOC,
  pricePerKwh: 2.29,
  elapsedSeconds: 0,
  wsConnected: false,
  lastInvoice: null,
  invoiceHistory: [],
  degradedServices: [],

  fetchDashboardInvoices: async () => {
    let token = useAuthStore.getState().user?.token;
    if (!token) {
      const ok = await useAuthStore.getState().login();
      if (ok) token = useAuthStore.getState().user?.token;
    }
    if (!token) return;

    const res = await getDriverDashboardUseCase.execute(token);
    if (res.ok) {
      set({
        invoiceHistory: res.value.invoices,
        degradedServices: res.value.degradedServices,
      });
    }
  },

  startCharging: async (stationName, chargerId, powerKw, pricePerKwh) => {
    if (timer) clearInterval(timer);
    if (ws) {
      ws.close();
      ws = null;
    }
    lastWsMeterAt = 0;

    set({
      isCharging: true,
      stationName,
      chargerId,
      reservationId: null,
      powerKw,
      energyKwh: 0.0,
      targetKwh: TARGET_KWH,
      batteryPercent: INITIAL_SOC,
      pricePerKwh,
      elapsedSeconds: 0,
      wsConnected: false,
      lastInvoice: null,
    });

    // Inicia o relógio e a curva de carga imediatamente (só cede lugar ao WS quando eventos 'meter' reais chegarem)
    timer = setInterval(() => {
      const state = get();
      if (!state.isCharging) return;

      const elapsed = state.elapsedSeconds + 1;
      // Só pausa o cálculo local se o simulador MQTT enviou leitura 'meter' real nos últimos 4s
      if (Date.now() - lastWsMeterAt < 4000) {
        set({ elapsedSeconds: elapsed });
        return;
      }

      // Reduz potência após 80% de bateria (curva real CC-CV de baterias Li-ion)
      const taperFactor = state.batteryPercent >= 80 ? 0.45 : 0.96 + Math.random() * 0.08;
      const currentPower = +(powerKw * taperFactor).toFixed(1);
      const addedKwh = (currentPower * (1 / 3600)) * 60;
      const totalKwh = Math.min(state.targetKwh, +(state.energyKwh + addedKwh).toFixed(2));
      const batteryPercent = computeBatteryPercent(totalKwh, state.targetKwh);

      if (totalKwh >= state.targetKwh || batteryPercent >= 100) {
        if (timer) clearInterval(timer);
        timer = null;
        if (ws) {
          ws.close();
          ws = null;
        }
        set({
          isCharging: false,
          elapsedSeconds: elapsed,
          powerKw: 0,
          energyKwh: state.targetKwh,
          batteryPercent: 100,
          lastInvoice: {
            stationName: state.stationName,
            chargerId: state.chargerId,
            energyKwh: state.targetKwh,
            pricePerKwh: state.pricePerKwh,
            totalAmount: +(state.targetKwh * state.pricePerKwh).toFixed(2),
            elapsedSeconds: elapsed,
            issuedAt: new Date().toLocaleTimeString('pt-BR'),
          },
        });
        return;
      }

      set({
        elapsedSeconds: elapsed,
        powerKw: currentPower,
        energyKwh: totalKwh,
        batteryPercent,
      });
    }, 1000);

    // Tenta autenticar e criar reserva real + WebSocket no BFF se disponível
    let token = useAuthStore.getState().user?.token;
    if (!token) {
      const ok = await useAuthStore.getState().login();
      if (ok) token = useAuthStore.getState().user?.token;
    }

    if (token) {
      let resv = await apiClient.request<{ id: string }>('/api/v1/reservations', {
        method: 'POST',
        token,
        body: { chargerId },
        timeoutMs: 3000,
      });

      // Se deu 409 Conflict (ex.: motorista já tinha uma reserva ativa anterior), limpa ou reaproveita a reserva ativa
      if (!resv.ok) {
        const dash = await apiClient.request<{
          activeReservation?: { id: string; chargerId: string; status: string } | null;
        }>('/api/v1/dashboard', { token, timeoutMs: 3000 });

        const active = dash.ok ? dash.value?.activeReservation : null;
        if (active) {
          if (active.chargerId === chargerId) {
            resv = { ok: true, value: { id: active.id } };
          } else if (active.status === 'CONFIRMED') {
            await apiClient.request(`/api/v1/reservations/${encodeURIComponent(active.id)}/cancel`, {
              method: 'POST',
              token,
              timeoutMs: 3000,
            });
            resv = await apiClient.request<{ id: string }>('/api/v1/reservations', {
              method: 'POST',
              token,
              body: { chargerId },
              timeoutMs: 3000,
            });
          }
        }
      }

      if (resv.ok && resv.value?.id) {
        const reservationId = resv.value.id;
        set({ reservationId });
        await apiClient.request(`/api/v1/reservations/${encodeURIComponent(reservationId)}/start`, {
          method: 'POST',
          token,
          timeoutMs: 3000,
        });
      }

      try {
        ws = new WebSocket(`${env.wsUrl}?access_token=${encodeURIComponent(token)}`);
        ws.onopen = () => set({ wsConnected: true });
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'meter' && typeof msg.energyKwh === 'number') {
              lastWsMeterAt = Date.now();
              const st = get();
              set({
                energyKwh: msg.energyKwh,
                powerKw: msg.powerKw ?? st.powerKw,
                batteryPercent: computeBatteryPercent(msg.energyKwh, st.targetKwh),
              });
            } else if (msg.type === 'invoice') {
              if (timer) clearInterval(timer);
              timer = null;
              const st = get();
              const finalKwh = typeof msg.energyKwh === 'number' ? msg.energyKwh : st.energyKwh;
              const finalAmount =
                typeof msg.amount === 'number' ? msg.amount : +(finalKwh * st.pricePerKwh).toFixed(2);
              set({
                isCharging: false,
                powerKw: 0,
                energyKwh: finalKwh,
                batteryPercent: 100,
                lastInvoice: {
                  stationName: st.stationName,
                  chargerId: st.chargerId,
                  energyKwh: finalKwh,
                  pricePerKwh: st.pricePerKwh,
                  totalAmount: finalAmount,
                  elapsedSeconds: st.elapsedSeconds,
                  issuedAt: new Date().toLocaleTimeString('pt-BR'),
                },
              });
              get().fetchDashboardInvoices();
            }
          } catch {
            // Ignora payload malformado
          }
        };
        ws.onclose = () => set({ wsConnected: false });
      } catch {
        // Segue com telemetria local se WebSocket não conectar
      }
    }
  },

  stopCharging: async () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (ws) {
      ws.close();
      ws = null;
    }

    const state = get();
    const { reservationId } = state;
    const token = useAuthStore.getState().user?.token;
    if (reservationId && token) {
      await apiClient.request(`/api/v1/reservations/${encodeURIComponent(reservationId)}/cancel`, {
        method: 'POST',
        token,
        timeoutMs: 2500,
      });
    }

    set({
      isCharging: false,
      wsConnected: false,
      reservationId: null,
      lastInvoice:
        state.energyKwh > 0
          ? {
              stationName: state.stationName,
              chargerId: state.chargerId,
              energyKwh: state.energyKwh,
              pricePerKwh: state.pricePerKwh,
              totalAmount: +(state.energyKwh * state.pricePerKwh).toFixed(2),
              elapsedSeconds: state.elapsedSeconds,
              issuedAt: new Date().toLocaleTimeString('pt-BR'),
            }
          : null,
    });
  },

  clearInvoice: () => {
    set({ lastInvoice: null, energyKwh: 0, batteryPercent: INITIAL_SOC, elapsedSeconds: 0 });
  },

  updateTelemetry: (powerKw, energyKwh) => {
    set((st) => ({
      powerKw,
      energyKwh,
      batteryPercent: computeBatteryPercent(energyKwh, st.targetKwh),
    }));
  },
}));
