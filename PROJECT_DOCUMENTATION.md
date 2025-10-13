# Bloom Energy Contract Learning & Rules Management System

Updated: 2025-09-18 (UTC)

## Table of Contents
- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Source Tree](#source-tree)
- [Frontend Architecture](#frontend-architecture)
  - [Application Shell](#application-shell)
  - [Contract Authoring Workflow](#contract-authoring-workflow)
  - [Document Management Workflow](#document-management-workflow)
  - [AI and Analytics UI](#ai-and-analytics-ui)
- [Backend Architecture](#backend-architecture)
  - [Express Application](#express-application)
  - [Route Packages](#route-packages)
  - [Service Layer](#service-layer)
  - [Middleware](#middleware)
- [Data Model (Prisma)](#data-model-prisma)
- [AI and Document Processing Pipeline](#ai-and-document-processing-pipeline)
- [Authentication & Authorization](#authentication--authorization)
- [Client-Side Persistence & Feature Flags](#client-side-persistence--feature-flags)
- [Testing Strategy](#testing-strategy)
- [Tooling & Common Commands](#tooling--common-commands)
- [Deployment & Operations](#deployment--operations)
- [Known Gaps and Follow-Ups](#known-gaps-and-follow-ups)
- [Troubleshooting Notes](#troubleshooting-notes)

## Overview
The Bloom Energy Contract Learning & Rules Management System streamlines authoring, review, and continuous improvement of Bloom Energy service agreements. The platform combines a React frontend, an Express API, and a PostgreSQL schema managed through Prisma. AI-assisted tooling (Anthropic Claude, optional OpenAI, OCR utilities) helps with contract suggestion, rule extraction, and document insight generation. When upstream services are offline, the application falls back to local storage and mock responses so analysts can continue iterating UI flows.

Core responsibilities include:
- Guided contract creation across financial, technical, and operational dimensions.
- Library views for search, comparison, and template-driven reuse.
- Document intake with OCR, metadata capture, and AI-driven field mapping (mocked locally, wired on server).
- Business rule learning, validation, and anomaly detection.
- Health, analytics, and notification surfaces for operational awareness.

## High-Level Architecture
```
+--------------------+        +-------------------------+        +---------------------+
|  React + Vite      | <----> | Express API (Node 20+)  | <----> | PostgreSQL + Prisma |
|  Tailwind UI       |        | Prisma ORM, Services    |        | generated client    |
|  LocalStorage      |        | AI & Rules Pipelines    |        |                     |
+---------^----------+        +-----------^-------------+        +----------^----------+
          |                               |                                   |
          |                               |                                   |
          v                               v                                   v
   Browser storage             External AI Providers                 Redis (optional)
 (contracts, ai logs)     (Anthropic, OpenAI, Textract mock)      Uploads/Logs on disk
```
Front-end development runs on Vite port 4000 with a proxy to the API on port 4003. Production builds serve the compiled UI from the backend runtime container.

## Source Tree
```
ContractRulesEngine/
├── src/                     # React application
│   ├── components/          # Layout, contract tabs, dashboard, documents, rules
│   ├── contexts/            # Auth context (login, token storage)
│   ├── hooks/               # useContract, useAI, data sync, notifications
│   ├── services/            # Fetch wrappers, AI helpers, PDF utilities
│   ├── types/               # Shared TypeScript definitions
│   └── utils/               # Validation, constants, feature flags, storage helpers
├── server/
│   ├── src/app.js           # Express app configuration (inline endpoints + dynamic imports)
│   ├── src/routes/          # Modular API routers (auth, contracts, ai, templates, etc.)
│   ├── src/services/        # Business logic, AI adapters, file pipeline, rule extraction
│   ├── src/middleware/      # Auth, validation, caching, auditing, learning instrumentation
│   ├── migrate.js           # Local storage migration utility
│   └── scripts/             # Seed script and migration helpers
├── prisma/schema.prisma     # Database schema and enums
├── generated/prisma/        # Prisma client output (generated)
├── docker-compose.yml       # Postgres, Redis, app container orchestration
├── Dockerfile               # Multi-stage build (frontend + backend)
├── vite.config.ts           # Dev server (port 4000) and proxy to backend port 4003
├── README.md                # Quick start
└── PROJECT_DOCUMENTATION.md # This document
```
Many directories contain historical snapshots with a ` 2` suffix (for example `routes/bulk 2.js`). Prefer the version without the suffix; the duplicates are safe to delete once no longer needed.

## Frontend Architecture
The UI is a Vite-powered React 19 project with Tailwind CSS styling and a light-weight shadcn-inspired component library. All network calls are made relative to `/api`, letting the Vite proxy forward requests to the Express server in development.

### Application Shell
- Entry point: `src/main.tsx` wraps the application inside `AuthProvider` and mounts it on `#root` using React 18 concurrent APIs (`createRoot`).
- `src/App.tsx` selects between `AuthPage` and the authenticated experience (`BloomContractSystem`) based on `AuthContext` state. Loading spinners are rendered while the initial `/api/auth/me` probe completes.
- Layout components (`src/components/layout/*`) compose an application frame with persistent navigation, header, and a right-side content pane sized to the 7-tab contract workflow.

### Contract Authoring Workflow
- `useContract` (`src/hooks/useContract.ts`) centralizes form state, validation, and persistence. It merges default values with optional AI-extracted data, runs validation through `validateContract`, and exposes helpers for tab navigation and contract generation.
- `ContractTabs` orchestrates the create/basic/system/financial/operating/technical/business-rules/summary tabs. Each tab component (for example `BasicInfoTab`, `FinancialTab`) receives the current `ContractFormData` and reports field changes back through `onFieldChange`.
- `contractService` (`src/services/contractService.ts`) is the canonical data layer. It talks to `/api/contracts*` endpoints, transforms payloads to/from API shape, and falls back to localStorage when the network fails. Helper functions compute totals (`calculateTotalContractValue`) and yearly rates for real-time feedback.
- `BusinessRulesDisplay` surfaces learned rules and validation warnings; it binds to `aiService` and `patternLearningService` outputs when available.

### Document Management Workflow
- `DocumentUploader`, `DocumentManager`, `DocumentView`, and `DocumentGroupManager` handle ingestion, preview, grouping, and AI-assisted mapping of uploaded artifacts.
- The current client-side implementation simulates upload, OCR, and AI analysis flows with synthetic delays and mock outputs via `AIFormMappingService`. When the backend upload pipeline is enabled (`/api/uploads` and `/api/documents`), these components can be wired to real responses.
- Document events notify parent containers so the rest of the experience (contract creation, rule extraction) can preload inferred data.

### AI and Analytics UI
- `AIAssistantTab` and `SimpleCostCalculator` orchestrate user prompts, AI responses, and structured suggestions. They use `aiService` to reach `/api/ai/chat` and cache transcripts in localStorage.
- `Dashboard` aggregates `/api/contracts`, `/api/ai/analytics`, and `/api/ai/health` endpoints to show status cards, charts, and recent activity. Chart components rely on Recharts.
- `useAI`, `useNotifications`, and `useDataSync` hooks exist for streaming updates (websocket integration is stubbed because the real-time service is not yet attached to the running server).

## Backend Architecture
The backend is an Express 5 application running in ESM mode. Prisma is optional; the app bootstraps without a database connection but degrades certain endpoints to in-memory results.

### Express Application
- `server/src/server.js` loads environment variables (`dotenv`), calls `initializePrisma`, and starts the HTTP server on `PORT` (default 4003). It terminates the process for unhandled rejections or uncaught exceptions to avoid silent corruption.
- `initializePrisma` inside `server/src/app.js` conditionally imports the generated Prisma client and validates the database connection with a five-second timeout. When `DATABASE_URL` is absent or invalid, `prisma` remains `null` and the app serves mock data only.
- Global middleware: `helmet` (with permissive CORP), CORS (configurable through `CORS_ORIGIN`), request rate limiting (currently disabled in development), JSON and URL-encoded body parsers (50 MB cap), and a health check at `/api/health`.
- Inline fallback endpoints in `app.js` provide basic contract and document responses, plus a mock AI analytics payload. These are used only when the richer route modules are not registered.

### Route Packages
Located under `server/src/routes`. Unless noted, each router expects `req.prisma` to be available.
- `auth.js`: Registration, login, logout, refresh token rotation, and session management. Rate limiting is applied to sensitive endpoints.
- `contracts.js`: Full CRUD with filtering, pagination, validation, auditing, and interaction capture. It returns `{ contracts, pagination }` payloads expected by the frontend. **Currently not mounted** by `app.js`; wire it with `app.use('/api/contracts', contractsRouter)` once Prisma is active.
- `documents.js`: Advanced document queries, processing queues, retry, and deletion flows.
- `uploads.js`: Multipart ingestion (memory storage), validation via `fileService`, disk persistence under `server/uploads`, metadata storage, and optional AI-to-form mapping.
- `ai.js`: Central AI interface that delegates to `AIManager` for chat, optimization, analysis, rule extraction, and cost statistics. Provides streaming and cached responses.
- `rules.js`, `learning.js`, `bulk.js`, `templates.js`, `notifications.js`, `monitoring.js`, `integration.js`, `audit.js`, `textract.js`: Specialized controllers for rules engine operations, continuous learning, batch jobs, template CRUD, websocket notifications, observability, third-party integrations, audit history, and AWS Textract orchestration. Several rely on service mocks until external providers are provisioned.

### Service Layer
- AI: `server/src/services/ai/*` contains provider abstractions, a model registry, cost tracking, and provider-specific clients (`AnthropicProvider`, `OpenAIProvider`). High-level orchestration happens in `AIManager`.
- Document pipeline: `fileService`, `documentProcessingService`, `awsTextractService`, `localTextractService`, and `aiToContractService` cover file validation, OCR (pdf-parse, mammoth, node-tesseract-ocr, sharp), chunking, metadata extraction, and AI-driven mapping into contract forms.
- Business logic: `templateService`, `bulkOperationsService`, `notificationService`, `learningService`, `managementPlatformService`, `reportingService`, and `validationService` implement domain workflows.
- Observability: `loggingService`, `errorHandlingService`, and `cacheService` back structured logging, error classification, and reusable Redis caching abstractions.
- Real-time: `realTimeService.js` exposes Socket.IO based pub/sub. It currently uses CommonJS syntax (`require`) and is not wired into the running app; it will need an adapter to work in ESM mode.

### Middleware
- `auth.js`: JWT verification (`Authorization: Bearer <token>`), optional auth (no failure when unauthenticated), and role-based authorization.
- `validation.js`: Joi schemas and reusable validators for params, queries, and body payloads.
- `audit.js`: Captures before/after states, writes audit logs, and associates user context with mutations.
- `learningMiddleware.js`: Records user interactions for the learning system, including contract events, template usage, and AI feedback.
- `aiCache.js`: In-memory cache wrappers with instrumentation hooks for AI responses.
- `errorHandler.js`: Standardized error responses.

## Data Model (Prisma)
Key models from `prisma/schema.prisma` (see file for full definition):

| Model | Purpose | Notes |
| --- | --- | --- |
| `Contract` | Primary contract record | Links to financial, technical, operating params, templates, uploads, AI analyses, groups, classifications. |
| `FinancialParams` | Rates and incentives | Linked 1:1 with `Contract`; stores base rate, escalation, adders. |
| `TechnicalParams` | Electrical configuration | Voltage levels, server counts, component arrays, REC type. |
| `OperatingParams` | Operational guarantees | Output warranty, efficiency, demand range, critical output. |
| `ContractTemplate` | Reusable templates | JSON `formData`, usage metrics, relation to contracts. |
| `UploadedFile` | Document intake | Status tracking, file paths, extracted data blob, anomaly summary. |
| `ContractAnalysis` | AI analysis results | Summary scores, extracted rules, anomalies, risk factors. |
| `LearnedRule` | Business rule knowledge base | Rule metadata, scope, confidence, references, audit info. |
| `User` | Platform accounts | Role enum (`ADMIN`, `MANAGER`, `USER`, `VIEWER`), status flags. |
| `Session` | Auth sessions | Access and refresh tokens, expiration, metadata. |
| `AuditLog` | Change history | Entity diffs, user attribution, signatures. |
| `AiMessage`, `AiInteraction` | Chat history and structured AI events | Supports conversation replay and feedback loops. |
| `SystemStat`, `ProcessingJob`, `Notification` | Operational telemetry and async job tracking. |

Enumerations cover contract status (`DRAFT`, `ACTIVE`, ...), system types, document types, processing states, AI providers, rule types, and audit actions.

## AI and Document Processing Pipeline
1. **Upload Initiation**: Frontend hits `/api/uploads/single` or `/api/uploads/multiple` (or the mock `/api/documents/contracts/:id/upload/multiple`). `multer` stores files in memory for validation.
2. **Validation and Storage**: `fileService.validateFile` enforces size and mime restrictions, `generateUniqueFilename` ensures unique names, and buffers are written to `server/uploads`.
3. **Text Extraction**: Depending on mime type, the service uses pdf-parse, mammoth (DOCX), or node-tesseract-ocr / sharp for images. Extracted text plus metadata is embedded in the `UploadedFile` record.
4. **AI Analysis**: `documentProcessingService` aggregates extraction results, calls `aiService` / `AIManager` (with Anthropic by default), and persists analyses to `ContractAnalysis`. In dev without keys, mock data is produced.
5. **AI-to-Form Mapping**: `aiToContractService` and frontend `AIFormMappingService` translate AI insights into partial `ContractFormData`, enabling prefilled contract creation flows.
6. **Rule Extraction**: `ruleExtractionService` mines documents for conditional logic and populates `LearnedRule` entries, tracked per contract and categorized by `RuleType`.

## Authentication & Authorization
- **Backend flow**: `POST /api/auth/login` validates credentials with bcrypt, issues JWT access tokens (`1h`) and refresh tokens (`30d`), and stores the session in Prisma. `POST /api/auth/refresh` rotates tokens, `POST /api/auth/logout` deactivates sessions.
- **Frontend flow**: `AuthContext` stores whichever token field is returned under `localStorage.authToken`, calls `/api/auth/me` on load, and exposes `login`/`logout`. Protected components read `useAuth()`.
- **Token mismatch to note**: Several services (`contractService`, `aiService`, `DocumentUploader`) expect a token in `localStorage.accessToken`, while `AuthContext` uses the `authToken` key. This mismatch prevents authenticated API calls unless storage is normalized.
- **Authorization**: `authorize` middleware enforces roles (ADMIN, MANAGER, USER, VIEWER). Optional auth allows unauthenticated document uploads while still attaching user info when present.

## Client-Side Persistence & Feature Flags
- `src/utils/storage.ts` wraps `localStorage` with JSON parsing and error handling. Keys live in `STORAGE_KEYS` (contracts, templates, ai messages, user preferences).
- `contractService` and related services use storage as a cache and as a fallback when backend calls fail.
- `src/utils/featureFlags.ts` exposes simple boolean switches for experimental UI. Flags are read at runtime without a remote config service.
- `useLocalStorage` hook syncs stateful React components with browser storage for small pieces of data (view preferences, last selected contract).

## Testing Strategy
- Jest multi-project configuration (`jest.config.js` and `jest.config 2.js`). Projects `Frontend` and `Backend` share setup under `src/test/setup.ts` and `server/src/test/setup.js`.
- Existing tests:
  - `src/components/__tests__/NotificationCenter.test.tsx` verifies the notification UI behavior.
  - `src/services/__tests__/contractService.test.ts` covers transformation logic and storage fallback.
  - `server/src/routes/__tests__/contracts.test.js` validates the modular contract router when mounted in isolation.
  - `server/src/services/__tests__/errorHandlingService.test.js` ensures error categorization utilities work.
- Gaps: no end-to-end coverage; AI, document pipeline, and real-time services are largely untested. Adding integration tests that boot Express with an in-memory database (via Prisma test client) is recommended once the modular routes replace the inline stubs.

## Tooling & Common Commands
- Package scripts (`package.json`):
  - `npm run dev` – start Vite dev server (port 4000).
  - `npm run server:dev` – start Express with nodemon (port 4003).
  - `npm run dev:full` – run frontend and backend concurrently.
  - `npm run build` – TypeScript compile + Vite build output in `dist/`.
  - `npm run type-check` or `npm run lint` – strict TypeScript compile without emit.
  - `npm run test`, `npm run test:frontend`, `npm run test:backend`, `npm run test:coverage` – run Jest suites.
  - `npm run db:migrate`, `npm run db:seed`, `npm run db:reset`, `npm run db:studio` – Prisma schema management and seeding (`server/src/scripts/seedData.js`).
  - `npm run migrate` – run `server/migrate.js`, which converts legacy localStorage contract exports into the relational schema.
- Additional helper scripts in `/scripts` (deploy.sh, deploy-local.sh) scaffold deployment pipelines.

## Deployment & Operations
- **Runtime**: Node 18+ (alpine in Dockerfile). Production container installs only production dependencies, copies the built frontend, Prisma client, and starts with `npm run server:start`.
- **Docker Compose**: `docker-compose.yml` defines `postgres` (port 5432), `redis` (port 6379), and `app` (port 4003) services. Health checks ensure dependencies are ready before the app boots. Uploads and logs are stored on named volumes.
- **Environment variables** (see `.env.example` and docker compose defaults):
  - `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`.
  - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEFAULT_AI_PROVIDER`, `ANTHROPIC_MODEL`.
  - `CORS_ORIGIN`, `UPLOAD_DIR`, `LOG_LEVEL`, `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX_REQUESTS`.
  - `AWS_REGION` and any Textract credentials when OCR is offloaded to AWS.
- **Static assets and uploads**: Frontend assets live in `public/`, runtime uploads in `uploads/`. Keep these directories writable in production.
- **Observability**: Logs write to stdout and optionally to `logs/`. `server/scripts/health-check.js` backs container health probes.
- **Infrastructure as code**: `aws/cloudformation-template.yml` (and the historical copy with ` 2`) outline an AWS deployment (ECS + RDS + S3). Update these templates when the service list changes.

## Known Gaps and Follow-Ups
1. **Route registration**: `server/src/app.js` still serves basic `/api/contracts` JSON arrays. Mount `routes/contracts.js` (and other modular routers) after Prisma initialization to unlock filtering, pagination, and auditing features the frontend already expects.
2. **Token storage mismatch**: Align `AuthContext` and service helpers on a single localStorage key (`authToken` or `accessToken`) so authenticated requests succeed.
3. **Data shape alignment**: `contractService.loadContract` expects nested `contract.parameters.*` data that the inline endpoints do not return. Ensure the API includes the financial/technical/operating relations or adjust the client transformations.
4. **Document workflow**: Frontend currently mocks upload and AI analysis. Hook `DocumentUploader` to `/api/uploads` and `/api/documents` once those routes are stabilized, and remove mock generators.
5. **CommonJS modules**: Files such as `server/src/services/realTimeService.js` use `require` in an ESM project. Convert them to ES modules before wiring them into the runtime.
6. **Duplicate files**: Clean up `* 2.js` snapshots to avoid confusion and ensure tooling (lint/tests) only scans the intended implementation.
7. **AI credentials**: Without `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`), the backend falls back to mock responses. Document this for QA and ensure production secrets are injected securely.
8. **Redis optionality**: Several services assume Redis availability (for caching). Guard the connection logic so the API degrades gracefully when Redis is absent.
9. **Testing coverage**: High-risk features (auth, rule extraction, uploads) lack automated tests. Prioritize integration suites that span frontend service calls to backend routes.

## Troubleshooting Notes
- Server does not start when `DATABASE_URL` is missing: expected behavior. Either set the env var or accept reduced functionality with in-memory fallbacks.
- Contract list is empty on first load: run `npm run db:seed` after migrations, or import legacy data with `npm run migrate`.
- Authenticated calls returning 401 despite successful login: confirm the token key matches between `AuthContext` and the service making the request.
- Document uploads rejected as "File type not supported": verify the mime type list in `uploads.js` or adjust the frontend allowed types to match the backend filter.
- AI endpoints returning mock data: confirm Anthropic/OpenAI keys and selected models are present in the environment, then restart the server to reinitialize `AIManager`.
- Socket notifications unavailable: real-time service is not yet attached to the HTTP server. Integrate `RealTimeService` once the module is migrated to ES syntax.

This documentation should serve as the primary reference point when revisiting the project, onboarding contributors, or planning the upcoming feature fix you mentioned. Update sections as modules evolve so the system picture remains accurate.
