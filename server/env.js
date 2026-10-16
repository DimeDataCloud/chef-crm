// env.js - fail fast when required secrets are missing. Imported first by index.js.
const REQUIRED = ['SESSION_SECRET', 'ADMIN_PASSWORD', 'ADMIN2_PASSWORD'];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());
if (missing.length) {
  console.error(`[config] Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('[config] Copy .env.example to .env, fill in every value, and start again.');
  process.exit(1);
}
