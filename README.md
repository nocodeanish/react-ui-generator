# React AI UI Generator

AI-powered React UI component generator with live preview, Tailwind CSS, and Next.js. Build beautiful, responsive React components through natural language conversations with Claude AI.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/anish3592)

## Overview

React AI UI Generator is a web-based tool that transforms your component ideas into production-ready React code. Simply describe what you want to build, and Claude AI will generate complete components with Tailwind CSS styling, live preview, and instant feedback. Perfect for rapid prototyping, learning React, or accelerating your development workflow.

**Key Highlights:**
- 🤖 Powered by Anthropic's Claude AI for intelligent code generation
- ⚡ Live preview with instant hot reload
- 🎨 Beautiful UI components with Tailwind CSS v4
- 💾 Virtual file system - no disk operations required
- 🔐 Secure authentication and project persistence
- 📝 Full code editor with syntax highlighting
- 🎯 Works with or without API key (demo mode available)

## Prerequisites

- Node.js 18+ (Node.js 25+ supported)
- npm

## Quick Start

### 1. Environment Setup

**Optional but Recommended:** Add your Anthropic API key to `.env`:

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

**For Production:** Generate and set a JWT secret:

```bash
JWT_SECRET=$(openssl rand -base64 32)
```

> **Note:** Without an API key, the app runs in demo mode with limited functionality using static component templates.

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

### Core Capabilities
- **AI-Powered Generation** - Natural language to React components using Claude AI
- **Live Preview** - Real-time component rendering with hot reload
- **Virtual File System** - In-memory file operations with security sandboxing
- **Code Editor** - Monaco editor with syntax highlighting and IntelliSense
- **Multi-File Support** - Create complex component structures with imports
- **Iterative Development** - Refine components through conversation

### Security & Performance
- **Rate Limiting** - Built-in protection for auth and API endpoints
- **Input Validation** - Path traversal prevention, file size limits, extension whitelist
- **Secure Authentication** - JWT-based sessions with timing attack prevention
- **Demo Mode** - Graceful degradation without API key

### User Experience
- **Anonymous Mode** - Start building without signup
- **Project Persistence** - Save and resume work (requires account)
- **Export Code** - Download generated components
- **Error Handling** - Comprehensive error boundaries and user feedback

## Usage

1. **Start a New Project**
   - Sign up for an account or continue as anonymous user
   - Click "New Project" to begin

2. **Describe Your Component**
   - Type natural language descriptions like "Create a contact form with validation"
   - Claude AI interprets your request and generates React code

3. **Preview & Iterate**
   - View your component in real-time in the Preview tab
   - Switch to Code tab to inspect and edit generated files
   - Continue the conversation to refine and improve

4. **Save & Export**
   - Authenticated users can save projects for later
   - Export generated code to use in your projects

## Tech Stack

- **Frontend:** React 19, Next.js 15 (App Router), TypeScript
- **Styling:** Tailwind CSS v4, Radix UI components
- **AI:** Anthropic Claude (Sonnet), Vercel AI SDK
- **Database:** Prisma ORM with SQLite
- **Code Editor:** Monaco Editor, Babel standalone (JSX transform)
- **Testing:** Vitest, React Testing Library (252 tests)
- **Authentication:** JWT (jose), bcrypt

## Topics

`ai` `react` `nextjs` `tailwindcss` `ui-components` `code-generation` `vercel-ai`

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
npm run test             # Run test suite (252 tests)
npm run test -- <file>   # Run specific test file
npm run lint             # Run ESLint
```

## Project Structure

```
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/chat/          # AI chat API endpoint
│   │   └── [projectId]/       # Project editor page
│   ├── components/            # React components
│   │   ├── auth/             # Authentication forms
│   │   ├── chat/             # Chat interface
│   │   ├── editor/           # Code editor & file tree
│   │   └── preview/          # Live preview iframe
│   ├── lib/                   # Core utilities
│   │   ├── contexts/         # React contexts (Chat, FileSystem)
│   │   ├── transform/        # JSX transformation
│   │   ├── file-system.ts    # Virtual file system
│   │   ├── provider.ts       # AI provider (Claude/mock)
│   │   ├── auth.ts           # JWT authentication
│   │   └── rate-limit.ts     # Rate limiting
│   └── actions/               # Server actions (auth, projects)
├── prisma/                    # Database schema & migrations
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
