# chef-crm

A meal-prep subscription and private-event catering CRM for independent chefs. Runs as a single Node.js process with no runtime dependencies.

## Features

- **Subscribers:** weekly meal-prep customers with a standing order (meals and servings), delivery day, dietary notes and active, paused or cancelled status.
- **Meal library:** editable menu with category, price, unit, description, tags and an active toggle. Subscriptions and prep quantities both read from it.
- **Weekly schedule:** aggregates every active standing order into a prep list grouped by delivery day, plus one-off batches per week.
- **Venue events:** catering pipeline from inquiry to quoted, booked, completed or cancelled, shown as a drag-and-drop board.
- **Quote calculator:** guest count times per-person rate by service type, plus add-ons, travel fee, discount, tax and a computed deposit. Calculated on the server.
- **Analytics:** recurring revenue, upcoming and completed event revenue, collected payments, revenue by month and most-ordered meals.
- **Settings:** business profile, brand accent colours, default pricing, tax rate, deposit percentage, travel fees and event service types.
- **Demo mode:** optional timed reset to seed data, with a visible banner and `noindex` header.

## Tech stack

- Node.js 22 or later, using the built-in `node:http` and `node:sqlite` modules
- Vanilla JavaScript single-page app (no build step), plain CSS
- Session auth with an HMAC-signed cookie and scrypt password hashes
- Docker image based on `node:24-slim`

## Quick start

Requires Node.js 22 or later.

```bash
cd chef-crm
cp .env.example .env
```

Edit `.env` and set `SESSION_SECRET`, `ADMIN_PASSWORD` and `ADMIN2_PASSWORD`. A random secret can be generated with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Install (none needed, there are no runtime dependencies) and start:

```bash
npm start
```

Open http://localhost:3011 and sign in with `ADMIN_EMAIL` or `ADMIN2_EMAIL` and the matching password.

### Docker

```bash
docker build -t chef-crm .
docker run --env-file .env -p 3011:3011 -v chef-data:/app/data chef-crm
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_SECRET` | Yes | none | Key used to sign session cookies. Use a long random value. |
| `ADMIN_PASSWORD` | Yes | none | Password for the first owner account. |
| `ADMIN2_PASSWORD` | Yes | none | Password for the second account. |
| `ADMIN_EMAIL` | No | `owner@example.com` | Login email for the first owner account. |
| `ADMIN_NAME` | No | `Owner` | Display name for the first owner account. |
| `ADMIN2_EMAIL` | No | `get@dimedata.cloud` | Login email for the second account. |
| `PORT` | No | `3011` | HTTP port. |
| `DB_PATH` | No | `data/chef.db` | SQLite database file. |
| `DEMO_MODE` | No | `0` | Set to `1` to reset all data on a timer and mark the site `noindex`. |
| `DEMO_RESET_MIN` | No | `20` | Minutes between demo resets. |

The two accounts are created only when the `users` table is empty, on first boot. Changing the password variables later does not change existing accounts.

## Project structure

```
chef-crm/
├── server/
│   ├── env.js        # fails fast when required secrets are missing
│   ├── index.js      # HTTP server, static files, session auth, API dispatch
│   ├── api.js        # REST handlers and quote calculator
│   └── db.js         # schema, helpers and seed data
├── public/
│   ├── index.html    # app shell
│   ├── login.html    # sign-in page
│   ├── css/style.css
│   └── js/app.js     # client-side SPA
├── .env.example
├── Dockerfile
└── package.json
```

## Status

Reference build. The HALO workspace lists a demo deployment for this project. Confirm the current hosting with the owner before relying on a live URL.

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Dime Data.
