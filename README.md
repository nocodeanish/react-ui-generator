# React AI UI Generator

AI-powered React UI component generator with live preview, Tailwind CSS, and Next.js. Build beautiful, responsive React components through natural language conversations with multiple AI providers.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/anish3592)

## Overview

React AI UI Generator is a web-based tool that transforms your component ideas into production-ready React code. Simply describe what you want to build, and AI will generate complete components with Tailwind CSS styling, live preview, and instant feedback. Perfect for rapid prototyping, learning React, or accelerating your development workflow.

**Key Highlights:**
- 🤖 Multi-provider AI support (Anthropic Claude, OpenAI, Google Gemini, OpenRouter, xAI Grok)
- ⚙️ Per-project provider and model selection
- ⚡ Live preview with instant hot reload
- 🎨 Beautiful UI components with Tailwind CSS v4
- 💾 Virtual file system - no disk operations required
- 🔐 Secure authentication and encrypted API key management
- 📝 Full code editor with syntax highlighting and IntelliSense
- 🌓 Dark/light theme support
- 🎯 Works with or without API key (demo mode available)

## Prerequisites

- Node.js 18+ (Node.js 25+ supported)
- npm

## Quick Start

### 1. Environment Setup

**For Production (Required):** Generate and set a JWT secret:

```bash
JWT_SECRET=$(openssl rand -base64 32)
```

**AI Provider API Keys (Optional but Recommended):**

Add at least one AI provider API key to `.env`:

```bash
# Choose one or more providers
ANTHROPIC_API_KEY=your-anthropic-key-here
OPENAI_API_KEY=your-openai-key-here
GOOGLE_AI_API_KEY=your-google-key-here
OPENROUTER_API_KEY=your-openrouter-key-here
XAI_API_KEY=your-xai-key-here
```

> **Note:**
> - Without an API key, the app runs in demo mode with limited functionality
> - Users can also add their own API keys via the Settings dialog (stored encrypted with AES-256-GCM)
> - Environment keys take priority over user-stored keys

### 2. Install and Initialize

```bash
npm run setup
```

This will:
- Install all dependencies
- Generate Prisma client
- Run database migrations

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### AI & Code Generation
- **Multi-Provider Support** - Choose from Anthropic Claude, OpenAI GPT, Google Gemini, OpenRouter, or xAI Grok
- **Per-Project Settings** - Select different providers and models for each project
- **AI-Powered Generation** - Natural language to React components with intelligent code generation
- **Live Preview** - Real-time component rendering with hot reload
- **Virtual File System** - In-memory file operations with security sandboxing
- **Code Editor** - Monaco editor with syntax highlighting and IntelliSense
- **Multi-File Support** - Create complex component structures with imports
- **Iterative Development** - Refine components through conversation

### Security & Performance
- **Encrypted API Keys** - User API keys stored with AES-256-GCM encryption
- **Rate Limiting** - Built-in protection for auth and API endpoints (sign up, sign in, chat, settings)
- **Input Validation** - Path traversal prevention, file size limits, extension whitelist
- **Secure Authentication** - JWT-based sessions with timing attack prevention
- **Demo Mode** - Graceful degradation without API key

### User Experience
- **Project Management** - Rename, delete, and organize projects
- **Dark/Light Theme** - Automatic theme switching with next-themes
- **Anonymous Mode** - Start building without signup
- **Project Persistence** - Save and resume work (requires account)
- **Settings Management** - Add and manage API keys for multiple providers
- **Export Code** - Download generated components
- **Error Handling** - Comprehensive error boundaries and user feedback

## Usage

1. **Start a New Project**
   - Sign up for an account or continue as anonymous user
   - Click "New Project" to begin

2. **Configure Your AI Provider (Optional)**
   - Click the Settings icon to add API keys for different providers
   - Select your preferred provider and model from the dropdown
   - Each project can use a different AI provider/model

3. **Describe Your Component**
   - Type natural language descriptions like "Create a contact form with validation"
   - AI interprets your request and generates React code

4. **Preview & Iterate**
   - View your component in real-time in the Preview tab
   - Switch to Code tab to inspect and edit generated files
   - Continue the conversation to refine and improve

5. **Manage & Export**
   - Rename or delete projects from the sidebar
   - Authenticated users can save projects for later
   - Export generated code to use in your projects

## Tech Stack

- **Frontend:** React 19, Next.js 15 (App Router), TypeScript
- **Styling:** Tailwind CSS v4, Radix UI components, next-themes
- **AI Providers:**
  - Anthropic Claude (Sonnet, Haiku, Opus)
  - OpenAI (GPT-4o, GPT-4o Mini, GPT-4 Turbo)
  - Google AI (Gemini 2.0 Flash, Gemini 1.5 Pro/Flash)
  - OpenRouter (Multi-provider access)
  - xAI (Grok 2, Grok 2 Mini)
  - Vercel AI SDK for unified interface
- **Database:** Prisma ORM with SQLite
- **Security:** AES-256-GCM encryption for API keys, scrypt key derivation
- **Code Editor:** Monaco Editor, Babel standalone (JSX transform)
- **Testing:** Vitest, React Testing Library (556 tests)
- **Authentication:** JWT (jose), bcrypt

## Topics

`ai` `react` `nextjs` `tailwindcss` `ui-components` `code-generation` `vercel-ai` `claude` `openai` `gpt-4` `gemini` `multi-provider` `ai-sdk` `component-generator`

## Documentation

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive architecture and development guide
- **[SECURITY.md](SECURITY.md)** - Security guidelines and deployment checklist

## Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:daemon       # Start dev server in background (logs to logs.txt)

# Build & Production
npm run build            # Create production build
npm run start            # Start production server

# Database
npm run setup            # Full setup (install + generate + migrate)
npm run db:reset         # Reset database (WARNING: deletes all data)

# Testing & Quality
npm run test             # Run test suite (556 tests)
npm run test -- <file>   # Run specific test file
npm run test -- --run    # Run all tests once (no watch)
npm run lint             # Run ESLint
```

## Project Structure

```
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/
│   │   │   ├── chat/          # AI chat API endpoint
│   │   │   ├── settings/      # User API key management (with validate/ and check/ subpaths)
│   │   │   └── project/       # Project settings API
│   │   └── [projectId]/       # Project editor page
│   ├── components/            # React components
│   │   ├── auth/             # Authentication forms
│   │   ├── chat/             # Chat interface
│   │   ├── editor/           # Code editor, file tree, provider selector
│   │   ├── preview/          # Live preview iframe
│   │   ├── projects/         # Project list and management
│   │   ├── settings/         # Settings dialog
│   │   ├── providers/        # Theme provider
│   │   ├── layout/           # Mobile layout components
│   │   ├── onboarding/       # Onboarding tooltips
│   │   └── ui/               # Radix UI components (toast, skeleton, tooltip, etc.)
│   ├── hooks/                 # Custom React hooks
│   │   ├── useMediaQuery.ts  # SSR-safe media query detection
│   │   └── useKeyboardShortcuts.ts # Global keyboard shortcuts
│   ├── lib/                   # Core utilities
│   │   ├── contexts/         # React contexts (Chat, FileSystem)
│   │   ├── providers/        # AI provider registry and mock
│   │   ├── transform/        # JSX transformation
│   │   ├── file-system.ts    # Virtual file system
│   │   ├── provider.ts       # Multi-provider AI integration
│   │   ├── crypto.ts         # API key encryption (AES-256-GCM)
│   │   ├── auth.ts           # JWT authentication
│   │   ├── rate-limit.ts     # Rate limiting
│   │   ├── constants.ts      # Centralized constants
│   │   ├── validation.ts     # Input validation utilities
│   │   ├── api-responses.ts  # HTTP response helpers
│   │   ├── api-key-validators.ts # Provider key validation
│   │   ├── api-types.ts      # Shared API type definitions
│   │   └── design-tokens.ts  # UI design tokens
│   └── actions/               # Server actions
│       ├── index.ts          # Auth (sign up, sign in)
│       ├── create-project.ts # Create new project
│       ├── get-project.ts    # Fetch project
│       ├── get-projects.ts   # List projects
│       ├── rename-project.ts # Rename project
│       ├── delete-project.ts # Delete project
│       └── get-default-provider.ts # Provider detection
├── prisma/                    # Database schema & migrations
├── .github/                   # GitHub configuration
│   └── FUNDING.yml           # Sponsor button config
├── CLAUDE.md                  # Architecture documentation
└── SECURITY.md               # Security guidelines
```

## Contributing

Contributions are welcome! Please read the architecture documentation in [CLAUDE.md](CLAUDE.md) before submitting PRs.

## Support

If you find this project helpful and want to support its development, consider buying me a coffee! Your support helps keep this project alive and growing.

<a href="https://buymeacoffee.com/anish3592" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60"></a>

Every contribution, no matter how small, is greatly appreciated and motivates me to keep improving this tool.

## License

MIT

---

Made with ❤️ by [Anish](https://buymeacoffee.com/anish3592)
