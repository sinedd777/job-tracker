# Job Tracker

A desktop application built with Electron and React that helps users manage their job applications through an organized, filterable dashboard with automated job ingestion and local-first storage.


## Prerequisites

- Node.js (>= 18.0.0)
- npm (>= 9.0.0)

## Quick Start

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/yourusername/job-tracker.git
   cd job-tracker
   npm install
   ```

2. Create a `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Development:
   ```bash
   npm start
   ```

## Tech Stack

- Frontend: React, TailwindCSS
- Backend: Electron, SQLite
- Language: TypeScript
- Build: Vite, electron-builder

## Project Structure

```
job-tracker/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts
│   ├── renderer/       # React application
│   ├── shared/         # Shared types
│   └── database/       # Database schemas
└── resources/          # Application resources
```
