// db.js - schema, helpers, seed. node:sqlite (built into Node 22+, zero npm deps).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = process.env.DB_PATH || join(ROOT, 'data', 'chef.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  pw TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'entree',
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'serving',
  tags TEXT NOT NULL DEFAULT '[]',
  photo_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT, phone TEXT, address TEXT,
  plan_meals_per_week INTEGER NOT NULL DEFAULT 4,
  servings_per_meal INTEGER NOT NULL DEFAULT 1,
  delivery_day TEXT NOT NULL DEFAULT 'sunday',
  dietary_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  price_per_week REAL NOT NULL DEFAULT 0,
  selections TEXT NOT NULL DEFAULT '[]',
  start_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscribers(status);

CREATE TABLE IF NOT EXISTS weekly_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  meal_id INTEGER REFERENCES meals(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wo_week ON weekly_overrides(week_start);

CREATE TABLE IF NOT EXISTS venue_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  email TEXT, phone TEXT,
  event_date TEXT, event_time TEXT,
  venue_name TEXT, address TEXT,
  guest_count INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'drop_off',
  status TEXT NOT NULL DEFAULT 'inquiry',
  per_person_rate REAL NOT NULL DEFAULT 0,
  addons TEXT NOT NULL DEFAULT '[]',
  travel_fee REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  deposit_pct REAL NOT NULL DEFAULT 25,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  menu_items TEXT NOT NULL DEFAULT '[]',
  quote_total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_status ON venue_events(status);
CREATE INDEX IF NOT EXISTS idx_event_date ON venue_events(event_date);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  ref_id INTEGER,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  method TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pay_date ON payments(date);
`);

export const now = () => new Date().toISOString();

// ─── auth helpers ──────────────────────────────────────────────────────────
export function hashPw(pw) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(pw, salt, 64).toString('hex');
}
export function checkPw(pw, stored) {
  try {
    const [salt, key] = String(stored).split(':');
    const a = Buffer.from(key, 'hex');
    const b = scryptSync(pw, salt, 64);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

export function setting(k, v) {
  if (v === undefined) {
    const row = db.prepare('SELECT v FROM settings WHERE k=?').get(k);
    return row ? JSON.parse(row.v) : null;
  }
  db.prepare('INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run(k, JSON.stringify(v));
  return v;
}

// ─── seed data ───────────────────────────────────────────────────────────────
const SEED_MEALS = [
  { name: 'Herb-Roasted Chicken & Rice', category: 'entree', description: 'Free-range chicken thigh, garlic herb jasmine rice, charred broccolini.', price: 13.5, tags: ['gluten-free', 'high-protein'] },
  { name: 'Braised Short Rib', category: 'entree', description: 'Red-wine braised short rib, whipped potato, roasted carrots.', price: 17, tags: ['signature'] },
  { name: 'Miso-Glazed Salmon', category: 'entree', description: 'Miso salmon, sesame greens, sushi rice.', price: 16, tags: ['gluten-free', 'pescatarian'] },
  { name: 'Southern Shrimp & Grits', category: 'entree', description: 'Blackened shrimp, stone-ground grits, andouille cream.', price: 15, tags: ['signature'] },
  { name: 'Roasted Vegetable Grain Bowl', category: 'entree', description: 'Farro, roasted seasonal veg, tahini, pickled onion.', price: 12, tags: ['vegan', 'vegetarian'] },
  { name: 'Thai Basil Beef', category: 'entree', description: 'Ground beef, thai basil, jasmine rice, fried egg.', price: 14, tags: ['spicy'] },
  { name: 'Overnight Oats - Peach & Pecan', category: 'breakfast', description: 'Steel-cut oats, brown sugar peach, toasted pecan.', price: 7, tags: ['vegetarian'] },
  { name: 'Egg White Bites', category: 'breakfast', description: 'Spinach, roasted red pepper, feta.', price: 6.5, tags: ['gluten-free', 'vegetarian'] },
  { name: 'Roasted Garlic Mash', category: 'side', description: 'Yukon gold, roasted garlic, brown butter.', price: 4.5, tags: ['gluten-free', 'vegetarian'] },
  { name: 'Charred Brussels Sprouts', category: 'side', description: 'Balsamic glaze, toasted almond.', price: 4.5, tags: ['vegan'] },
  { name: 'Brown Butter Blondie', category: 'dessert', description: 'Brown butter, sea salt, toasted pecan.', price: 5, tags: ['vegetarian'] },
];

const DEFAULT_ADDONS = [
  { name: 'Bar / drink service', price: 250 },
  { name: 'Extra serving staff (per person)', price: 150 },
  { name: 'Rentals - tables, linens, chafing', price: 180 },
  { name: 'Custom dessert course', price: 6 },
];

const DEFAULT_EVENT_TYPES = [
  { key: 'drop_off', label: 'Drop-off catering', per_person_rate: 22 },
  { key: 'staffed', label: 'Staffed buffet', per_person_rate: 38 },
  { key: 'plated', label: 'Full-service plated', per_person_rate: 65 },
];

export function seed() {
  if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
    const pw = process.env.ADMIN_PASSWORD;
    db.prepare('INSERT INTO users (email,name,role,pw,created_at) VALUES (?,?,?,?,?)')
      .run((process.env.ADMIN_EMAIL || 'owner@example.com').toLowerCase().trim(), process.env.ADMIN_NAME || 'Owner', 'owner', hashPw(pw), now());
    db.prepare('INSERT INTO users (email,name,role,pw,created_at) VALUES (?,?,?,?,?)')
      .run((process.env.ADMIN2_EMAIL || 'get@dimedata.cloud').toLowerCase().trim(), 'Admin', 'admin', hashPw(process.env.ADMIN2_PASSWORD), now());
  }

  if (!db.prepare('SELECT COUNT(*) c FROM meals').get().c) {
    const ins = db.prepare(`INSERT INTO meals (name,category,description,price,unit,tags,active,sort_order,created_at,updated_at)
      VALUES (?,?,?,?,'serving',?,1,?,?,?)`);
    SEED_MEALS.forEach((m, i) => ins.run(m.name, m.category, m.description, m.price, JSON.stringify(m.tags), i, now(), now()));
  }

  if (!setting('business')) {
    setting('business', {
      name: 'Kitchen OS',
      chef_name: 'Your Name',
      tagline: 'Weekly meal prep & private event catering',
      email: 'you@example.com',
      phone: '(555) 555-5555',
      service_area: 'Your service area',
      logo_note: 'Dish photos + brand mark - add yours in Settings',
    });
  }

  if (!setting('pricing')) {
    setting('pricing', {
      default_meal_price: 13.5,
      event_types: DEFAULT_EVENT_TYPES,
      addons: DEFAULT_ADDONS,
      travel: { flat_fee: 0, free_radius_miles: 15, per_mile: 2.5 },
      deposit_pct: 25,
      tax_rate: 9.25,
    });
  }

  if (!setting('brand')) {
    setting('brand', { accent: '#c1531f', accent2: '#5c6b3d', mode: 'light' });
  }
}

// ─── demo mode ─────────────────────────────────────────────────────────────
// Wipes everything mutable back to the pristine seed set. Leaves `users` alone
// so logins keep working across a reset. Called on an interval when
// DEMO_MODE=1 so a demo visitor can click around freely without anything
// they do sticking around for the next person (or forever).
export function resetDemoData() {
  db.exec(`
    DELETE FROM weekly_overrides;
    DELETE FROM payments;
    DELETE FROM venue_events;
    DELETE FROM subscribers;
    DELETE FROM meals;
  `);
  db.prepare("DELETE FROM settings WHERE k IN ('business','pricing','brand')").run();
  seed();
}

export const MEAL_CATEGORIES = ['entree', 'side', 'breakfast', 'dessert', 'other'];
export const SUB_STATUSES = ['active', 'paused', 'cancelled'];
export const EVENT_STATUSES = ['inquiry', 'quoted', 'booked', 'completed', 'cancelled'];
export const EVENT_STATUS_LABELS = { inquiry: 'Inquiry', quoted: 'Quoted', booked: 'Booked', completed: 'Completed', cancelled: 'Cancelled' };
export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
