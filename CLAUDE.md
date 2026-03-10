# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (Windows)
npm run dev

# Run tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Lint
npm run lint

# Build
npm run build

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev
```

## Environment

Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without it, the app uses a `MockLanguageModel` that returns static pre-written components. The mock provider is detected via `!process.env.ANTHROPIC_API_KEY` in `src/lib/provider.ts`.

## Architecture

UIGen is a Next.js 15 App Router app that lets users describe React components in a chat interface, then generates and live-previews them in the browser.

### Request / Generation Flow

1. User sends a message in `ChatInterface` → `ChatProvider` (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat`
2. `src/app/api/chat/route.ts` reconstructs a `VirtualFileSystem` from serialized project data, calls `streamText` (Vercel AI SDK) with two tools: `str_replace_editor` and `file_manager`
3. Claude generates files by calling these tools, mutating the in-memory `VirtualFileSystem`
4. On `onFinish`, if a `projectId` is present and the user is authenticated, the full message history and serialized file system are persisted to `Project.messages` and `Project.data` (both stored as JSON strings in SQLite)
5. On the client, the `FileSystemContext` updates, causing `PreviewFrame` to re-render the live preview

### Virtual File System (`src/lib/file-system.ts`)

A pure in-memory tree (`VirtualFileSystem` class) with no disk I/O. Files are serialized to/from plain JSON for database storage and wire transport. All generated code lives here — nothing is written to disk.

### Live Preview (`src/lib/transform/jsx-transformer.ts`)

The preview is rendered inside an `<iframe>`. The transform pipeline:
1. Babel (standalone, client-side) transpiles each `.jsx`/`.tsx` file
2. Each transformed file becomes a Blob URL
3. An ES module import map is constructed mapping `@/` aliases, bare package names (resolved to `esm.sh`), and file paths to their Blob URLs
4. A full HTML document is assembled with the import map and injected into the iframe via `srcdoc`
5. Third-party packages not in the virtual FS are auto-resolved from `esm.sh`

### Authentication

JWT-based, stored in an httpOnly cookie (`auth-token`). Session logic is in `src/lib/auth.ts` (server-only). `src/middleware.ts` protects routes. Users can also use the app anonymously — anonymous sessions use a `anon-work-tracker` (`src/lib/anon-work-tracker.ts`) to track work without a DB user record.

### Data Model (Prisma / SQLite)
- The database schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database.                            
      
- `User`: email + bcrypt password
- `Project`: belongs to optional `User`; `messages` (JSON string array of AI SDK message objects) and `data` (JSON string of serialized `VirtualFileSystem` nodes)

Prisma client is generated to `src/generated/prisma` (not the default location).

### AI Tools

- `str_replace_editor` (`src/lib/tools/str-replace.ts`): text-editor-style tool; supports `view`, `create`, `str_replace`, `insert` commands on the virtual FS
- `file_manager` (`src/lib/tools/file-manager.ts`): file operations (rename, delete, etc.)

### Code Style

- Use comments sparingly — only for complex logic that isn't self-evident

### Key Conventions

- Generated components must have `/App.jsx` as the entry point with a default export
- All local imports inside generated code use the `@/` alias (maps to virtual FS root `/`)
- Styling is Tailwind CSS only — no hardcoded styles
- The system prompt (`src/lib/prompts/generation.tsx`) instructs Claude to keep responses brief and avoid HTML files
- The live model is `claude-haiku-4-5` (defined in `src/lib/provider.ts`)
