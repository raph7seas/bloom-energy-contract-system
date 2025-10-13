# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the Vite/React frontend (components, contexts, store, services) with shared helpers in `src/lib/` and `src/utils/`.
- `server/src/` hosts the Express API (controllers, services, routes, middleware) plus automation in `server/src/scripts/`.
- Database artefacts live in `prisma/schema.prisma` and `server/src/scripts/seedData.js`; keep migrations in sync before committing.
- Static assets ship from `public/` and `assets/`; OCR/cache output under `generated/` stays untracked.
- Tests live in `src/test/` and `server/src/test/`; colocate new specs with features when possible.

## Build, Test, and Development Commands
- `npm run dev` starts Vite on :5173; `npm run server:dev` runs the API via Nodemon—use `npm run dev:full` to launch both.
- `npm run build` compiles TypeScript and emits the production bundle to `dist/`; `npm run preview` serves it locally.
- `npm run lint` (same as `npm run type-check`) runs `tsc --noEmit` for static validation.
- Database workflow: `npm run db:migrate`, `npm run db:seed`, and `npm run db:reset` keep Prisma state in sync; `npm run db:studio` opens an inspection UI.
- `npm run server:start` boots the backend in production mode using env values loaded via `dotenv`.

## Coding Style & Naming Conventions
- Use 2-space indentation, ES modules, and `const`/arrow functions for pure utilities.
- React components are PascalCase (`BloomContractSystem`), hooks start with `use`, and non-component modules stay camelCase.
- Tailwind powers styling; central tokens live in `src/index.css` while shared UI logic stays in `src/components` and helpers in `src/lib/`.
- Run `npm run lint` before committing and mirror existing formatting (Prettier config is implicit via Vite defaults).

## Testing Guidelines
- Jest covers both layers. Use `npm run test:frontend` for React suites, `npm run test:backend` with Supertest for API specs, and `npm run test:coverage` to audit totals.
- Name specs with `.test.ts(x)` and place fixtures under `src/test/` or `server/src/test/` as appropriate.
- Maintain ≥80% coverage (see `prd.md`) and reset Prisma as needed with `npm run db:reset`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) as noted in `PROJECT_DOCUMENTATION.md`; keep commits focused and reference relevant modules or tickets.
- Before opening a PR, ensure `npm run build`, targeted Jest suites, and required Prisma migrations succeed.
- Provide PR descriptions with a concise summary, validation notes (commands, screenshots for UI), and links to the corresponding item in `tasks.md` or client trackers.
- Request reviewers for each layer affected (frontend/backend) and call out schema or config changes explicitly.
