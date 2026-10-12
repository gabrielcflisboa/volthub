import pg from 'pg';
import type { Invoice, OpenSession } from '../domain/billing.js';
import type { SessionStore, SessionTx } from '../application/ports.js';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS charging_sessions (
  session_id     VARCHAR(64) PRIMARY KEY,
  charger_id     VARCHAR(40) NOT NULL,
  station_id     VARCHAR(80) NOT NULL,
  reservation_id VARCHAR(36),
  driver_id      VARCHAR(64),
  price_per_kwh  NUMERIC(8,2) NOT NULL,
  energy_kwh     NUMERIC(10,3) NOT NULL DEFAULT 0,
  status         VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id     UUID PRIMARY KEY,
  session_id     VARCHAR(64) NOT NULL UNIQUE REFERENCES charging_sessions(session_id),
  driver_id      VARCHAR(64),
  charger_id     VARCHAR(40) NOT NULL,
  station_id     VARCHAR(80) NOT NULL,
  energy_kwh     NUMERIC(10,3) NOT NULL,
  price_per_kwh  NUMERIC(8,2) NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  currency       CHAR(3) NOT NULL,
  issued_at      TIMESTAMPTZ NOT NULL,
  published_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_driver ON invoices(driver_id);
CREATE TABLE IF NOT EXISTS processed_events (
  event_id     VARCHAR(64) PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

export async function createPool(url: string): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  await pool.query(MIGRATION);
  return pool;
}

const toInvoice = (r: Record<string, unknown>): Invoice => ({
  invoiceId: String(r.invoice_id),
  sessionId: String(r.session_id),
  driverId: (r.driver_id as string) ?? null,
  chargerId: String(r.charger_id),
  stationId: String(r.station_id),
  energyKwh: Number(r.energy_kwh),
  pricePerKwh: Number(r.price_per_kwh),
  amount: Number(r.amount),
  currency: 'BRL',
});

export class PgSessionStore implements SessionStore {
  constructor(private readonly pool: pg.Pool) {}

  async once(eventId: string, work: (tx: SessionTx) => Promise<void>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [eventId],
      );
      if (inserted.rowCount === 0) {
        await client.query('ROLLBACK');
        return false; // evento repetido: entregue de novo pelo Kafka, já foi aplicado
      }
      await work(new PgSessionTx(client));
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async unpublishedInvoices(): Promise<Invoice[]> {
    const r = await this.pool.query('SELECT * FROM invoices WHERE published_at IS NULL ORDER BY issued_at LIMIT 100');
    return r.rows.map(toInvoice);
  }

  async markPublished(invoiceId: string): Promise<void> {
    await this.pool.query('UPDATE invoices SET published_at = now() WHERE invoice_id = $1', [invoiceId]);
  }

  async invoicesOf(driverId: string): Promise<Invoice[]> {
    const r = await this.pool.query('SELECT * FROM invoices WHERE driver_id = $1 ORDER BY issued_at DESC', [driverId]);
    return r.rows.map(toInvoice);
  }

  async allInvoices(): Promise<(Invoice & { issuedAt: string })[]> {
    const r = await this.pool.query('SELECT * FROM invoices ORDER BY issued_at DESC LIMIT 200');
    return r.rows.map((row) => ({ ...toInvoice(row), issuedAt: new Date(row.issued_at).toISOString() }));
  }

  async session(sessionId: string) {
    const r = await this.pool.query('SELECT * FROM charging_sessions WHERE session_id = $1', [sessionId]);
    return r.rows[0] ?? null;
  }

  async summary() {
    const r = await this.pool.query(`
      SELECT station_id, count(*)::int AS sessions, coalesce(sum(energy_kwh),0)::float AS energy_kwh,
             coalesce(sum(amount),0)::float AS revenue
        FROM invoices GROUP BY station_id ORDER BY revenue DESC`);
    return r.rows;
  }
}

class PgSessionTx implements SessionTx {
  constructor(private readonly c: pg.PoolClient) {}

  async openSession(s: OpenSession, startedAt: string): Promise<void> {
    await this.c.query(
      `INSERT INTO charging_sessions (session_id, charger_id, station_id, reservation_id, driver_id, price_per_kwh, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (session_id) DO NOTHING`,
      [s.sessionId, s.chargerId, s.stationId, s.reservationId, s.driverId, s.pricePerKwh, startedAt],
    );
  }

  async findOpen(sessionId: string): Promise<OpenSession | null> {
    const r = await this.c.query(
      `SELECT * FROM charging_sessions WHERE session_id = $1 AND status = 'OPEN' FOR UPDATE`,
      [sessionId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      sessionId: row.session_id,
      chargerId: row.charger_id,
      stationId: row.station_id,
      reservationId: row.reservation_id,
      driverId: row.driver_id,
      pricePerKwh: Number(row.price_per_kwh),
      energyKwh: Number(row.energy_kwh),
    };
  }

  async updateEnergy(sessionId: string, energyKwh: number): Promise<void> {
    await this.c.query('UPDATE charging_sessions SET energy_kwh = $2 WHERE session_id = $1', [sessionId, energyKwh]);
  }

  async closeAndInvoice(i: Invoice, endedAt: string): Promise<void> {
    await this.c.query(
      `UPDATE charging_sessions SET status = 'CLOSED', ended_at = $2, energy_kwh = $3 WHERE session_id = $1`,
      [i.sessionId, endedAt, i.energyKwh],
    );
    await this.c.query(
      `INSERT INTO invoices (invoice_id, session_id, driver_id, charger_id, station_id, energy_kwh, price_per_kwh, amount, currency, issued_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [i.invoiceId, i.sessionId, i.driverId, i.chargerId, i.stationId, i.energyKwh, i.pricePerKwh, i.amount, i.currency, endedAt],
    );
  }
}
