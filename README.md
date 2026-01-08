# Cloudflare Workers React Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/muhamadfaez/maintenance-tracker)

A production-ready full-stack template for Cloudflare Workers with React frontend, powered by Durable Objects for scalable, multi-tenant storage. Includes a demo chat application with users, chat boards, and real-time messaging.

## Features

- **Serverless Backend**: Hono-based API routes with Cloudflare Durable Objects for entity storage (Users, Chats).
- **Reactive Frontend**: React 18 with TypeScript, TanStack Query, shadcn/ui components, and Tailwind CSS.
- **Indexed Entities**: Automatic listing, pagination, CRUD operations, and seeding for entities.
- **Zero-Config Deployment**: One-click deploy to Cloudflare Workers/Pages.
- **Modern UI**: Dark/light theme support, responsive design, animations, and accessibility.
- **Type-Safe**: Full TypeScript support across frontend, backend, and shared types.
- **Development Workflow**: Hot reload, error reporting, and Bun-powered scripts.
- **Scalable Storage**: Global Durable Object acts as a KV-like store with CAS for concurrency.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide icons, TanStack Query, React Router, Sonner (toasts), Framer Motion.
- **Backend**: Cloudflare Workers, Hono, Durable Objects (SQLite-backed).
- **Utilities**: Bun (package manager/scripts), Zod (validation), Immer (state), clsx/tw-merge (styling).
- **Dev Tools**: ESLint, Wrangler, Cloudflare Vite plugin.

## Quick Start

1. **Clone & Install**:
   ```bash
   git clone <your-repo-url>
   cd unimaintain-tracker-lhaji5ejhjmlqygnrpphq
   bun install
   ```

2. **Development**:
   ```bash
   bun dev
   ```
   Opens at `http://localhost:3000` (or `$PORT`).

3. **Deploy**:
   ```bash
   bun run deploy
   ```

## Installation

Ensure [Bun](https://bun.sh) is installed (>=1.0).

```bash
bun install
```

Generate Worker types:
```bash
bun run cf-typegen
```

## Development

- **Local Server**: `bun dev` – serves frontend and Worker API.
- **Type Checking**: `bun tsc --noEmit`.
- **Linting**: `bun lint`.
- **Preview Build**: `bun preview`.
- **Worker Only**: Modify `wrangler.jsonc` and use `wrangler dev`.

Frontend auto-proxies `/api/*` to the Worker. Shared types (`shared/`) ensure consistency.

**Customize**:
- Add routes: `worker/user-routes.ts`.
- New entities: Extend `IndexedEntity` in `worker/entities.ts`.
- UI: Edit `src/pages/`, use shadcn components (`@/components/ui/*`).
- Theme: Uses CSS vars + `useTheme` hook.
- Sidebar: Optional `AppLayout` in `src/components/layout/`.

## API Endpoints

All `/api/*` routes return `{ success: boolean; data?: T; error?: string }`.

### Users
- `GET /api/users?cursor=&limit=` – List users (paginated).
- `POST /api/users` – `{ name: string }` → Create user.
- `DELETE /api/users/:id` – Delete user.
- `POST /api/users/deleteMany` – `{ ids: string[] }`.

### Chats
- `GET /api/chats?cursor=&limit=` – List chats.
- `POST /api/chats` – `{ title: string }` → Create chat.
- `GET /api/chats/:chatId/messages` – List messages.
- `POST /api/chats/:chatId/messages` – `{ userId: string; text: string }`.
- Delete endpoints similar to users.

Test: `curl -X GET http://localhost:8787/api/users`.

**Seed Data**: Mocks auto-load on first list (`MOCK_USERS`, etc.).

## Deployment

Deploy to Cloudflare Workers/Pages:

1. **Configure** `wrangler.jsonc`:
   - Add `account_id` from [Cloudflare Dashboard](https://dash.cloudflare.com).
   - Set custom domain if needed.

2. **Build & Deploy**:
   ```bash
   bun run build  # Builds frontend to dist/
   bun run deploy # Deploys Worker + assets
   ```

3. **One-Click**:
   [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/muhamadfaez/maintenance-tracker)

**Custom Domain**: Update `assets.directory: "dist"` and deploy.

**Observability**: Metrics/logs enabled via `observability.enabled: true`.

## Project Structure

```
├── shared/          # Shared types & mocks
├── src/             # React frontend
├── worker/          # Hono API + Durable Objects
├── dist/            # Built frontend (gitignored)
└── wrangler.jsonc   # Deployment config
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Dev server (frontend + API) |
| `bun build` | Build frontend |
| `bun lint` | Lint code |
| `bun preview` | Preview production build |
| `bun deploy` | Full deploy |
| `bun cf-typegen` | Generate Worker types |

## Contributing

1. Fork & clone.
2. `bun install`.
3. Make changes, `bun lint`.
4. PR with description.

## License

MIT. See [LICENSE](LICENSE) (add if needed).