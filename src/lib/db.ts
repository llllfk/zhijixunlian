import { Pool } from 'pg';
import { hashPassword } from './password';

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!raw) throw new Error('DATABASE_URL is not set');
  return raw;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 8,
    });
  }
  return pool;
}

const DDL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_profiles (
  id varchar(36) PRIMARY KEY,
  email varchar(255),
  phone varchar(20),
  password_hash text,
  name varchar(128) NOT NULL DEFAULT '',
  role varchar(20) NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS name varchar(128);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'user';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE TABLE IF NOT EXISTS passenger_profiles (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name varchar(100) NOT NULL,
  description text,
  background_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS background_url text;
ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE passenger_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;

CREATE TABLE IF NOT EXISTS training_records (
  id varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id varchar(36) NOT NULL,
  profile_id varchar(36),
  profile_name varchar(100),
  status varchar(20) NOT NULL DEFAULT 'completed',
  duration_seconds integer NOT NULL DEFAULT 0,
  score integer,
  scores jsonb,
  result jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_records ADD COLUMN IF NOT EXISTS profile_id varchar(36);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS profile_name varchar(100);
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'completed';
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS score integer;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS scores jsonb;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS result jsonb;
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
ALTER TABLE training_records ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_uidx ON user_profiles(email);
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_phone_uidx ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS training_records_user_idx ON training_records(user_id);
CREATE INDEX IF NOT EXISTS passenger_profiles_sort_idx ON passenger_profiles(sort_order);
`;

const SEED_PROFILES: { name: string; description: string; sort_order: number; background_url: string }[] = [
  {
    name: '普通成人',
    description: '配合度高的常规旅客，按标准流程办理值机。',
    sort_order: 1,
    background_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80',
  },
  {
    name: '急脾气',
    description: '赶时间、容易不耐烦，要求办理迅速。',
    sort_order: 2,
    background_url: 'https://images.unsplash.com/photo-1544620341-1adc2baa1cae?w=1200&q=80',
  },
  {
    name: '老年旅客',
    description: '语速慢、听力一般，需要耐心解释。',
    sort_order: 3,
    background_url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=1200&q=80',
  },
  {
    name: '行李敏感',
    description: '特别关心托运与危险品，会追问细节。',
    sort_order: 4,
    background_url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=1200&q=80',
  },
  {
    name: '首次乘机',
    description: '不懂流程，需要主动指引与安抚。',
    sort_order: 5,
    background_url: 'https://images.unsplash.com/photo-1474302770737-173ee4aba716?w=1200&q=80',
  },
];

export async function ensureDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const p = getPool();
      await p.query(DDL);

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@coze.dev';
      const adminPhone = process.env.ADMIN_PHONE || '13699225251';
      const adminPassword = process.env.ADMIN_INIT_PASSWORD || 'Admin123456';
      const existingAdmin = await p.query(
        `SELECT id FROM user_profiles WHERE email = $1 OR phone = $2 LIMIT 1`,
        [adminEmail, adminPhone]
      );
      if ((existingAdmin.rowCount || 0) === 0) {
        await p.query(
          `INSERT INTO user_profiles (id, email, phone, password_hash, name, role, is_active)
           VALUES ($1,$2,$3,$4,'管理员','admin',true)`,
          [crypto.randomUUID(), adminEmail, adminPhone, hashPassword(adminPassword)]
        );
      }

      const { rows } = await p.query(`SELECT count(*)::int AS c FROM passenger_profiles`);
      if ((rows[0]?.c || 0) === 0) {
        for (const item of SEED_PROFILES) {
          await p.query(
            `INSERT INTO passenger_profiles (id, name, description, background_url, is_active, sort_order)
             VALUES ($1,$2,$3,$4,true,$5)`,
            [crypto.randomUUID(), item.name, item.description, item.background_url, item.sort_order]
          );
        }
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
}
