# Mic Share

**Mic Share** is a desktop application that lets friends share their live microphone
audio with one another in real time using [VB-CABLE](https://vb-audio.com/Cable/).

> "When I speak, my voice is sent through your microphone instead of yours."

The intended use is between consenting friends for experimentation, entertainment,
and voice swapping.

## Setup

| Place | Setting |
| ----- | ------- |
| Mic Share → Primary Microphone | Your real mic |
| Mic Share → Mic Share Virtual Microphone | Cable Input (VB-CABLE) |
| Mic Share → Playback | Your speakers/headphones |
| Discord/Valorant → Input Device | Cable Output |

## Architecture

```
                    ┌──────────────────┐
                    │      MySQL       │
                    └────────▲─────────┘
                             │ SQL
                    ┌────────┴─────────┐
                    │   Node.js Server │
                    │  Express + Socket.IO
                    └───────▲───▲──────┘
                            │   │  WebRTC signaling
              ┌─────────────┘   └─────────────┐
       ┌──────┴──────┐                 ┌──────┴──────┐
       │   User A    │                 │   User B    │
       │  Electron   │◄── WebRTC ────►│  Electron   │
       │  Microphone │    audio       │  VB-CABLE   │
       └─────────────┘                 └──────┬──────┘
                                              ▼
                                           Discord
```

- **MySQL** — persistent application data (users, friendships, sessions, settings).
- **Node.js server** — REST API, authentication, friend management, presence,
  WebRTC signaling via Socket.IO. It does **not** relay audio by default.
- **WebRTC** — real-time peer-to-peer microphone audio between users.
- **Electron client** — desktop UI and operating-system integration (mic capture,
  VB-CABLE output).
- **VB-CABLE** — virtual audio cable that lets other apps use received audio as a
  microphone input.

The installed app points at the official servers by default:

- API server: `https://micapi.nostep.space`
- TURN relay: `turn:voice.nostep.space:3478`

Users can override either in the app's Settings panel (e.g. to use their own server).

---

## Development

### Requirements

- Node.js **>= 20**
- npm (comes with Node)
- MySQL (for local server development)

### Install

```sh
npm install
```

### Run in development

```sh
npm run dev
```

This starts the backend server and the Electron client together. The backend
loads its configuration from a `.env` file at the project root (see
`.env.example`).

### Scripts

| Script               | What it does                          |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Start server + client in watch mode   |
| `npm run dev:server` | Start only the backend server         |
| `npm run dev:client` | Start only the Electron client        |
| `npm run build`      | Build server and client               |
| `npm run db:migrate` | Create/update the MySQL schema        |
| `npm run start`      | Start the backend server              |
| `npm run start:prod` | Start the backend in production mode  |
| `npm run lint`       | Lint server and client                |

## Building the installer

Build the Windows installer (`Mic Share Setup <version>.exe`) with:

```sh
npm run dist:win
```

Output lands in `client/release/`.

---

## Deploying the server

Your own backend, live at `https://micapi.nostep.space` (port 3020 behind a
reverse proxy). The TURN server (`voice.nostep.space`)

### 1. Upload the codebase to your VPS

The server needs the `server`, `shared`, and `database` workspaces. Upload the
whole project, **minus** `node_modules`, `client`, and `scripts`:

```sh
rsync -av --exclude node_modules --exclude client --exclude scripts ./ user@VPS_IP:/opt/micshare/
```

### 2. Install dependencies

```sh
cd /opt/micshare
npm install --omit=dev
```

`--omit=dev` skips the client's `electron`/`electron-builder` downloads — only
what the server needs is installed.

### 3. Create `.env` at the project root

```sh
cp .env.example .env
```

Fill in at least:

| Variable      | Example                 | Notes                          |
| ------------- | ----------------------- | ------------------------------ |
| `SERVER_PORT` | `3020`                  | Node listen port               |
| `SERVER_URL`  | `https://micapi.nostep.space` | Public URL              |
| `AUTH_SECRET` | 32+ random hex chars    | **Required** (min 16 chars)    |
| `DB_HOST`     | `127.0.0.1`             | Your MySQL host                |
| `DB_USER`     |                         |                                |
| `DB_PASSWORD` |                         |                                |
| `DB_NAME`     | `mic_share`             | Created automatically          |

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Start the server (schema is auto-migrated)

The server applies any pending database migrations automatically on startup
(`CREATE DATABASE IF NOT EXISTS` + all pending migrations), so fresh deployments
work out of the box. You can still run them manually if you prefer:

```sh
npm run db:migrate
```

### 5. Keep it running with pm2

```sh
npm i -g pm2
pm2 start "npm run start:prod" --name micshare-api
pm2 save && pm2 startup
```

Check logs with `pm2 logs micshare-api`.

### 6. HTTPS via a reverse proxy

The Node server is plain HTTP on 3020. Point DNS `micapi.nostep.space` at the
VPS, then proxy 443 → `127.0.0.1:3020` **with WebSocket upgrade** (Socket.IO
needs it).

**Caddy (easiest — auto TLS, WebSockets work out of the box):**

```
micapi.nostep.space {
    reverse_proxy 127.0.0.1:3020
}
```

**nginx** (use certbot for the certificates):

```nginx
server {
    server_name micapi.nostep.space;
    listen 443 ssl http2;
    location / {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7. Firewall

Open `443/tcp` for the API and `3478/tcp` + `3478/udp` for the TURN server.
`3020` can stay closed to the public — only the local proxy needs it.

### 8. Verify

```sh
curl https://micapi.nostep.space/api/health
# -> { "status": "ok", "database": "connected", ... }
```

### Updating

```sh
cd /opt/micshare
rsync -av --exclude node_modules ./ user@VPS_IP:/opt/micshare/   # or git pull
npm install --omit=dev
npm run db:migrate
pm2 restart micshare-api
```

---

## Troubleshooting

| Symptom | Likely fix |
| ------- | ---------- |
| `AUTH_SECRET` config error on start | `.env` missing `AUTH_SECRET` (min 16 chars), or `.env` isn't at the project root |
| `Cannot reach the server` in the app | Reverse proxy down, or TLS/WebSocket upgrade not forwarded |
| Calls fail but login works | nginx missing the `Upgrade`/`Connection` headers (see step 6) |
| `ECONNREFUSED` from the proxy | Node server not running — check `pm2 status` |
| Weird module errors on the VPS | You uploaded `node_modules` — don't. `rm -rf node_modules && npm install --omit=dev` |
