# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## Commands

### Development & Build
- `npm run dev` - Start development server with Turbopack (http://localhost:3000)
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
- Node.js 18+ required
- Optional: Add `ANTHROPIC_API_KEY` to `.env` for real AI generation (without it, uses mock fallback)

## Architecture Overview

### Core Concept

UIGen is an AI-powered React component generator using Claude. The unique architecture centers on a **virtual file system** - components live in memory, not on disk. This enables:
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
- `ChatContext`: Wraps Vercel AI SDK's `useChat` hook. Manages messages, sends them to API with file state, delegates tool calls to FileSystemContext
- `FileSystemContext`: Wraps VirtualFileSystem class. Executes tool calls from Claude (create/edit/delete files), triggers UI updates via React state

**Key Components**:
- `src/app/page.tsx` - Home: authentication dialogs, project list for authenticated users
- `src/app/[projectId]/page.tsx` - Editor: main workspace with chat, code editor, and live preview
- `src/components/chat/` - Chat UI: message list, markdown rendering, input
- `src/components/editor/` - Code UI: Monaco editor, file tree navigation
- `src/components/preview/PreviewFrame.tsx` - Live preview iframe
- `src/components/auth/` - Auth forms: sign in/up

**Core Utilities**:
- `src/lib/file-system.ts` - VirtualFileSystem class: in-memory tree structure. Path-based operations (create/read/update/delete/rename). Serialization to/from JSON
- `src/lib/transform/jsx-transformer.ts` - Babel JSX transformation for preview. Creates import maps pointing to blob URLs. Generates HTML with error boundaries
- `src/lib/anon-work-tracker.ts` - Tracks anonymous user work in localStorage. Auto-saves file state and messages

### Backend Architecture

**API Route** (`src/app/api/chat/route.ts`):
- Receives: messages array, serialized VirtualFileSystem state, optional projectId
- Reconstructs VirtualFileSystem from serialized state
- Adds system prompt with prompt caching via Anthropic
- Streams text response with tool execution (up to 40 steps for real API, 4 for mock)
- Tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
- On completion: saves messages and file state to database (authenticated users only)

**Database** (`prisma/schema.prisma`, SQLite):
- **Schema Definition**: Reference `prisma/schema.prisma` to understand data structure for User and Project models
- **Database file**: `prisma/dev.db`

#### User Model
- `id` (String, PK) - CUID, auto-generated
- `email` (String, Unique) - User email, required for authentication
- `password` (String) - Bcrypt hashed password
- `createdAt` (DateTime) - Auto-set to creation time
- `updatedAt` (DateTime) - Auto-updated on modifications
- **Relations**: `projects` (one-to-many) - User can have multiple projects with CASCADE delete

#### Project Model
- `id` (String, PK) - CUID, auto-generated
- `name` (String) - Project name, required
- `userId` (String, FK, Optional) - References User.id. Optional for anonymous/temporary projects. CASCADE delete removes project if user deleted
- `messages` (String, JSON) - Serialized chat message history. Default: `"[]"`. Format: JSON array of message objects from AI SDK
- `data` (String, JSON) - Serialized VirtualFileSystem state. Default: `"{}"`. Format: JSON object representing file tree structure
- `createdAt` (DateTime) - Auto-set to creation time
- `updatedAt` (DateTime) - Auto-updated on modifications
- **Relations**: `user` (many-to-one) - Belongs to User (optional for anon work)

#### Key Patterns
- **Anon Projects**: `userId` is nullable to support temporary projects without user accounts
- **Persistence**: Both `messages` and `data` are JSON strings (not JSON type) for SQLite compatibility
- **Cascading Deletes**: Deleting a User automatically deletes all associated Projects
- **Migrations**: Run `npm run setup` to initialize schema or `npm run db:reset` to wipe and reinitialize

**Authentication** (`src/lib/auth.ts`):
- Cookie-based sessions using JWT (jose library)
- Password hashing with bcrypt
- Server-only utilities for session validation

**Server Actions** (`src/actions/`):
- `create-project.ts` - Creates new project for authenticated user
- `get-project.ts` - Fetches project with ownership validation
- `get-projects.ts` - Lists authenticated user's projects

### Prompt & AI Integration

**Generation Prompt** (`src/lib/prompts/generation.tsx`):
- System prompt instructing Claude to act as React component generator
- Specifies tools for file operations
- Conventions: App.jsx as entry point, Tailwind CSS styling, @/ import alias for local files

**Provider** (`src/lib/provider.ts`):
- Returns language model instance (Anthropic via Vercel AI SDK)
- Falls back to mock provider if ANTHROPIC_API_KEY not set

## Key Design Patterns

1. **Virtual File System**: Tree structure (FileNode) with path-based operations. Serializes to JSON for API transmission and database persistence. Avoids disk I/O for responsiveness

2. **Tool-Based Code Generation**: Claude uses defined tools (`str_replace_editor`, `file_manager`) instead of direct API calls. Frontend executes tool calls and updates UI accordingly

3. **Context Composition**: FileSystemContext provides reactive file system. ChatContext uses it to execute tool calls. Separates concerns: ChatContext handles messaging, FileSystemContext handles state

4. **Runtime JSX Transformation**: Preview component uses Babel standalone to transform JSX to JavaScript at runtime. Creates blob URLs for modules. Generates HTML with error boundaries and import maps

5. **Anon Work Tracking**: Anonymous sessions persist work in localStorage. On sign up, localStorage work can be migrated to database project

## Testing

Tests are colocated in `__tests__` directories (Vitest + React Testing Library):
- `src/lib/__tests__/file-system.test.ts` - VirtualFileSystem operations
- `src/lib/transform/__tests__/jsx-transformer.test.ts` - JSX transformation
- `src/components/chat/__tests__/` - Chat component tests
- `src/components/editor/__tests__/` - Editor component tests

Run with `npm run test` or `npm run test -- <filename>`. Environment: jsdom (configured in `vitest.config.mts`)
