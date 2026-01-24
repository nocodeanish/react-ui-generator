# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development & Build
- `npm run dev` - Start development server (http://localhost:3000)
- `npm run dev:daemon` - Start dev server in background, logs to `logs.txt`
- `npm run build` - Create production build
- `npm run start` - Start production server

### Database & Setup
- `npm run setup` - Install dependencies, generate Prisma client, run migrations
- `npm run db:reset` - Reset database (removes all data, re-runs migrations)

### Testing & Linting
- `npm run test` - Run all tests with Vitest
- `npm run test -- <filename>` - Run tests for a specific file
- `npm run lint` - Run ESLint

### Environment Setup
- Node.js 18+ required (Node.js 25+ supported with instrumentation polyfill)
- **REQUIRED for production**: Set `JWT_SECRET` in `.env` (generate with: `openssl rand -base64 32`)
- **Provider API Keys** (at least one recommended for full AI functionality):
  - `ANTHROPIC_API_KEY` - Anthropic Claude models
  - `OPENAI_API_KEY` - OpenAI GPT models
  - `GOOGLE_AI_API_KEY` - Google Gemini models
  - `OPENROUTER_API_KEY` - OpenRouter (multi-provider access)
  - `XAI_API_KEY` - xAI Grok models
- Users can also add their own API keys via the Settings dialog (stored encrypted)
- See `SECURITY.md` for complete security guidelines and deployment checklist

## Demo Mode (No API Key)

When no API key is available for the selected provider (neither environment variable nor user-stored key), the app runs in **demo mode**:
- Uses a mock provider that generates static component templates
- **Limited to 1 message per conversation** - users see a friendly prompt to add API key
- Supports counter, form, and card component types
- Input is disabled after first message with instructions to add API key
- Users can add their own API keys via Settings to enable full functionality

## Architecture Overview

### Core Concept

React AI UI Generator is an AI-powered React component generator using Claude. The unique architecture centers on a **virtual file system** - components live in memory, not on disk. This enables:
- Instant file operations without I/O
- Live preview updates
- User experimentation without filesystem changes
- Atomic save operations to database

### Data Flow

Three main flows interconnect:

1. **Chat Flow**: User message → Chat API `/api/chat` → Claude → Tool calls → Response with file operations
2. **File System Flow**: Tool calls from Claude → VirtualFileSystem executes changes → React state updates → UI reflects changes
3. **Persistence Flow**: User saves project → Serialize VirtualFileSystem to JSON → Prisma → SQLite database

### Frontend Architecture

**Contexts** (`src/lib/contexts/`):
- `ChatContext`: Wraps Vercel AI SDK's `useChat` hook. Manages messages, sends them to API with file state, delegates tool calls to FileSystemContext. Exposes error and reload for error handling.
- `FileSystemContext`: Wraps VirtualFileSystem class. Executes tool calls from Claude (create/edit/delete files), triggers UI updates via React state

**Key Components**:
- `src/app/page.tsx` - Home: authentication dialogs, project list for authenticated users
- `src/app/[projectId]/page.tsx` - Editor: main workspace with chat, code editor, and live preview
- `src/app/layout.tsx` - Root layout with `suppressHydrationWarning` for browser extension compatibility
- `src/components/chat/` - Chat UI: message list, markdown rendering, input with demo mode blocking
- `src/components/editor/` - Code UI: Monaco editor, file tree navigation, provider selector
- `src/components/editor/ProviderSelector.tsx` - Dropdown to select AI provider and model per project
- `src/components/preview/PreviewFrame.tsx` - Live preview iframe with sandbox security
- `src/components/auth/` - Auth forms: sign in/up
- `src/components/projects/ProjectList.tsx` - Project sidebar with rename, delete, delete all actions
- `src/components/settings/SettingsDialog.tsx` - Dialog for managing user API keys across providers
- `src/components/providers/theme-provider.tsx` - Theme context for dark/light mode

**Core Utilities**:
- `src/lib/file-system.ts` - VirtualFileSystem class with security limits (path validation, size limits, extension whitelist)
- `src/lib/transform/jsx-transformer.ts` - Babel JSX transformation for preview. Creates import maps pointing to blob URLs
- `src/lib/anon-work-tracker.ts` - Tracks anonymous user work in sessionStorage
- `src/lib/rate-limit.ts` - In-memory rate limiting for auth and API endpoints

### Backend Architecture

**API Route** (`src/app/api/chat/route.ts`):
- Validates content-type and JSON body
- Rate limits anonymous users (10 requests/hour)
- Filters messages for mock provider compatibility
- Streams text response with tool execution (up to 40 steps for real API, 2 for mock)
- Tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
- On completion: saves messages and file state to database (authenticated users only)

**Instrumentation** (`src/instrumentation.ts`):
- Polyfills localStorage for Node.js 25+ compatibility
- Node.js 25 has experimental localStorage that conflicts with browser API

**Database** (`prisma/schema.prisma`, SQLite):
- **Schema Definition**: Reference `prisma/schema.prisma` to understand data structure for User and Project models
- **Database file**: `prisma/dev.db`

#### User Model
- `id` (String, PK) - CUID, auto-generated
- `email` (String, Unique) - User email, normalized to lowercase
- `password` (String) - Bcrypt hashed password (min 8 chars, requires uppercase, lowercase, number)
- `createdAt` (DateTime) - Auto-set to creation time
- `updatedAt` (DateTime) - Auto-updated on modifications
- **Relations**: `projects` (one-to-many) - User can have multiple projects with CASCADE delete

#### UserSettings Model
- `id` (String, PK) - CUID, auto-generated
- `userId` (String, FK, Unique) - References User.id with CASCADE delete
- `apiKeys` (String) - Encrypted JSON of provider API keys (AES-256-GCM)
- `createdAt`, `updatedAt` - Timestamps

#### Project Model
- `id` (String, PK) - CUID, auto-generated
- `name` (String) - Project name, sanitized (max 100 chars, HTML stripped)
- `userId` (String, FK, Optional) - References User.id. CASCADE delete removes project if user deleted
- `messages` (String, JSON) - Serialized chat message history with safe parsing
- `data` (String, JSON) - Serialized VirtualFileSystem state with safe parsing
- `provider` (String) - AI provider ID (anthropic, openai, google, openrouter, xai). Default: "anthropic"
- `model` (String) - Specific model ID. Empty string means use provider default
- `createdAt` (DateTime) - Auto-set to creation time
- `updatedAt` (DateTime) - Auto-updated on modifications

#### Key Patterns
- **Anon Projects**: `userId` is nullable to support temporary projects without user accounts
- **Persistence**: Both `messages` and `data` are JSON strings (not JSON type) for SQLite compatibility
- **Cascading Deletes**: Deleting a User automatically deletes all associated Projects
- **Migrations**: Run `npm run setup` to initialize schema or `npm run db:reset` to wipe and reinitialize

**Authentication** (`src/lib/auth.ts`):
- Cookie-based sessions using JWT (jose library)
- Lazy JWT_SECRET initialization (avoids build-time errors)
- Password hashing with bcrypt
- Auto-deletes invalid/expired tokens

**Server Actions** (`src/actions/`):
- `index.ts` - Sign up/in with rate limiting, email validation, timing attack prevention
- `create-project.ts` - Creates new project with input sanitization
- `get-project.ts` - Fetches project with safe JSON parsing and ownership validation
- `get-projects.ts` - Lists authenticated user's projects
- `rename-project.ts` - Renames project with sanitization and ownership validation
- `delete-project.ts` - Deletes single project with ownership validation
- `delete-all-projects.ts` - Deletes all projects for current user
- `get-default-provider.ts` - Determines default provider based on available API keys (env → user settings → mock)

### Security Features

**Input Validation**:
- Email format validation with regex
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- Path traversal prevention in VirtualFileSystem
- File extension whitelist (.js, .jsx, .ts, .tsx, .css, .json, .md, .txt)
- File size limits (500KB per file, 5MB total, 100 files max)

**Rate Limiting** (`src/lib/rate-limit.ts`):
- Sign up: 3 attempts per hour per IP
- Sign in: 5 attempts per 15 minutes per IP
- Chat API (anonymous): 10 requests per hour per IP
- Settings API: 10 changes per hour per user

**Authentication Security**:
- Timing attack prevention on login (always runs bcrypt.compare)
- Generic error messages to prevent user enumeration
- HTTP-only, secure cookies in production

**API Key Security**:
- User API keys encrypted with AES-256-GCM before database storage
- Encryption key derived from `JWT_SECRET` using scrypt
- Keys never sent to client; only last 4 characters shown for identification
- Decryption only happens server-side when making API calls

### Multi-Provider Architecture

**Provider Registry** (`src/lib/providers/index.ts`):
- Defines supported AI providers: Anthropic, OpenAI, Google AI, OpenRouter, xAI (Grok)
- Each provider has: name, available models, default model, environment variable key
- Exports type-safe `ProviderId` and utilities: `getDefaultModel()`, `getModelConfig()`, `isValidProvider()`

**API Key Management**:
- **Priority order**: Environment variable → User-stored key → Mock provider
- Environment keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `OPENROUTER_API_KEY`, `XAI_API_KEY`
- User keys stored encrypted in `UserSettings.apiKeys`

**Encryption** (`src/lib/crypto.ts`):
- AES-256-GCM encryption for user API keys
- Key derived from `JWT_SECRET` using scrypt (memory-hard)
- Format: `salt:iv:authTag:encrypted` (all base64)
- Keys never exposed to client - only last 4 chars shown for identification

**Settings API** (`src/app/api/settings/route.ts`):
- `GET`: Returns provider configuration status (configured, source: env/user, lastFour)
- `POST`: Encrypts and saves API keys. Rate limited: 10 changes per hour per user
- `DELETE`: Removes all user API keys

**Project Settings API** (`src/app/api/project/[id]/settings/route.ts`):
- `GET`: Returns project's provider and model
- `PATCH`: Updates provider/model with validation. Resets model when provider changes

### Prompt & AI Integration

**Generation Prompt** (`src/lib/prompts/generation.tsx`):
- System prompt instructing Claude to act as React component generator
- Specifies tools for file operations
- Conventions: App.jsx as entry point, Tailwind CSS styling, @/ import alias for local files

**Provider** (`src/lib/provider.ts`):
- Returns language model for specified provider via Vercel AI SDK
- Supports multiple providers: Anthropic, OpenAI, Google AI, OpenRouter, xAI
- Falls back to mock provider if no API key available for selected provider
- Mock provider generates counter, form, or card components based on user input

## Key Design Patterns

1. **Virtual File System**: Tree structure (FileNode) with path-based operations. Serializes to JSON for API transmission and database persistence. Includes security limits.

2. **Tool-Based Code Generation**: Claude uses defined tools (`str_replace_editor`, `file_manager`) instead of direct API calls. Frontend executes tool calls and updates UI accordingly.

3. **Context Composition**: FileSystemContext provides reactive file system. ChatContext uses it to execute tool calls. Separates concerns: ChatContext handles messaging, FileSystemContext handles state.

4. **Runtime JSX Transformation**: Preview component uses Babel standalone to transform JSX to JavaScript at runtime. Creates blob URLs for modules. Generates HTML with error boundaries and import maps.

5. **Demo Mode Limiting**: Frontend detects demo mode from response text patterns and blocks input after 1 message, prompting users to add API key.

6. **Safe Message Handling**: MessageList extracts text from multiple message formats (string, array, parts) to handle both live and persisted messages.

## Testing

Tests are colocated in `__tests__` directories (Vitest + React Testing Library):
- `src/lib/__tests__/file-system.test.ts` - VirtualFileSystem operations and security limits
- `src/lib/__tests__/provider.test.ts` - Mock provider functionality
- `src/lib/transform/__tests__/jsx-transformer.test.ts` - JSX transformation
- `src/components/chat/__tests__/` - Chat component tests
- `src/components/editor/__tests__/` - Editor component tests
- `src/lib/contexts/__tests__/` - Context tests

Run with `npm run test` or `npm run test -- <filename>`. Environment: jsdom (configured in `vitest.config.mts`)

Current test count: 252 tests across 11 test files.
