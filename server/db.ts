import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'unitpulse.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let rawDb: SqlJsDatabase | null = null;

export async function initDatabase() {
  if (rawDb) return rawDb;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    rawDb = new SQL.Database(filebuffer);
  } else {
    rawDb = new SQL.Database();
  }

  // Create UnitPulse Schema
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      appointment TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      army_number TEXT UNIQUE NOT NULL,
      rank TEXT NOT NULL,
      name TEXT NOT NULL,
      trade TEXT NOT NULL,
      appointment TEXT NOT NULL,
      unit_joining_date TEXT NOT NULL,
      current_status TEXT NOT NULL DEFAULT 'PRESENT',
      status_reason TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS duties (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      personnel_id TEXT NOT NULL,
      duty_type TEXT NOT NULL,
      duty_role TEXT,
      shift_name TEXT,
      location TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_hours REAL NOT NULL,
      is_night_duty INTEGER NOT NULL DEFAULT 0,
      night_duty_hours REAL NOT NULL DEFAULT 0,
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pt_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      personnel_id TEXT NOT NULL,
      status TEXT NOT NULL,
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS games_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      personnel_id TEXT NOT NULL,
      status TEXT NOT NULL,
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leave_records (
      id TEXT PRIMARY KEY,
      personnel_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT,
      destination_address TEXT,
      emergency_contact TEXT,
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      actual_return_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT,
      updated_by TEXT,
      FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      appointment TEXT NOT NULL,
      user_display_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_personnel_army ON personnel(army_number);
    CREATE INDEX IF NOT EXISTS idx_personnel_status ON personnel(current_status);
    CREATE INDEX IF NOT EXISTS idx_duties_date ON duties(date);
    CREATE INDEX IF NOT EXISTS idx_duties_personnel ON duties(personnel_id);
    CREATE INDEX IF NOT EXISTS idx_pt_date ON pt_records(date);
    CREATE INDEX IF NOT EXISTS idx_games_date ON games_records(date);
    CREATE INDEX IF NOT EXISTS idx_leave_personnel ON leave_records(personnel_id);
  `);

  try {
    rawDb.exec('ALTER TABLE duties ADD COLUMN duty_role TEXT;');
  } catch (e) {}
  try {
    rawDb.exec('ALTER TABLE duties ADD COLUMN shift_name TEXT;');
  } catch (e) {}
  try {
    rawDb.exec('ALTER TABLE duties ADD COLUMN kote_cycle TEXT;');
  } catch (e) {}
  try {
    rawDb.exec('ALTER TABLE duties ADD COLUMN kote_group INTEGER;');
  } catch (e) {}

  saveDatabase();
  return rawDb;
}

export function saveDatabase() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

// Wrapper providing synchronous prepare/get/all/run API
export const db = {
  prepare(sql: string) {
    return {
      get(...params: any[]) {
        if (!rawDb) throw new Error('DB not initialized');
        const stmt = rawDb.prepare(sql);
        stmt.bind(params.flat());
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params: any[]) {
        if (!rawDb) throw new Error('DB not initialized');
        const results: any[] = [];
        const stmt = rawDb.prepare(sql);
        stmt.bind(params.flat());
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      run(...params: any[]) {
        if (!rawDb) throw new Error('DB not initialized');
        rawDb.run(sql, params.flat());
        saveDatabase();
        return { changes: 1 };
      },
    };
  },
  exec(sql: string) {
    if (!rawDb) throw new Error('DB not initialized');
    rawDb.exec(sql);
    saveDatabase();
  },
};
