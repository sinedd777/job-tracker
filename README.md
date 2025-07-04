# Job Tracker

A desktop application built with Electron and React that helps users manage their job applications through an organized, filterable dashboard with automated job ingestion and local-first storage with optional cloud synchronization.

## Features

- **Automated Job Ingestion**: Automatically fetch and import jobs from external sources
- **Interactive Dashboard**: Filter, sort, and manage job listings with ease
- **Offline-First**: Full functionality without internet connection
- **Cloud Sync**: Optional Supabase synchronization for multi-device access
- **Status Tracking**: Monitor application progress and deadlines
- **Communication Logging**: Keep track of all job-related communications
- **Notes & Reminders**: Attach notes and set reminders for important dates
- **Resume Enhancement**: AI-powered resume improvement suggestions based on your GitHub projects

### Resume Enhancement with GitHub Projects

The application includes a RAG (Retrieval-Augmented Generation) pipeline that:

1. Automatically fetches your GitHub repositories in the background
2. Analyzes job descriptions against your projects and experience
3. Generates tailored resume improvement suggestions
4. Highlights relevant projects, skills, and experience

This feature requires:
- `GITHUB_USERNAME` - Your GitHub username
- `GITHUB_TOKEN` - A personal access token with `repo` scope (create at https://github.com/settings/tokens)
- `OPENAI_API_KEY` - For enhanced AI-powered suggestions

## Prerequisites

- Node.js (>= 18.0.0)
- npm (>= 9.0.0)
- Git

## Quick Start

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/yourusername/job-tracker.git
   cd job-tracker
   npm install
   ```

2. Create a `.env` file:
   ```env
   # Required for cloud sync
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Required for resume enhancement
   GITHUB_USERNAME=your_github_username
   GITHUB_TOKEN=your_github_personal_access_token
   OPENAI_API_KEY=your_openai_api_key

   # Optional for debugging
   NODE_ENV=development
   DEBUG=job-tracker:*
   ```

3. Development:
   ```bash
   npm run dev
   ```

4. Build:
   ```bash
   npm run build
   ```

## Development Commands

- `npm run dev`: Start development environment
- `npm run build`: Build application
- `npm test`: Run tests
- `npm run lint`: Lint code
- `npm run format`: Format code

## Tech Stack

### Core Technologies
- **Frontend**: React, TailwindCSS, Zustand
- **Backend**: Electron, SQLite, Supabase
- **Language**: TypeScript
- **Build**: Vite, electron-builder

### Key Dependencies
- **Data Management**: better-sqlite3, @supabase/supabase-js
- **State & Data**: Zustand, React Query
- **Forms & UI**: React Hook Form, React Router
- **Utilities**: date-fns, electron-store, node-cron, winston

## Project Structure

```
job-tracker/
├── src/
│   ├── main/           # Electron main process
│   │   └── services/   # Backend services
│   ├── preload/        # Preload scripts
│   ├── renderer/       # React application
│   │   ├── components/ # UI components
│   │   ├── contexts/   # React contexts
│   │   └── pages/      # Application pages
│   ├── shared/         # Shared types and utilities
│   └── database/       # Database schemas and migrations
├── resources/          # Application resources
└── release/           # Built applications
```

## Performance Constraints

- Maximum local database size: 5GB
- UI response time: < 100ms
- Background sync interval: 15 minutes
- Maximum concurrent operations: 10

## Cross-Platform Support

- Windows 10/11
- macOS 10.15+
- Linux (major distributions)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
