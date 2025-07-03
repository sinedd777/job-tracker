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
   # OpenAI API for resume and email generation
   OPENAI_API_KEY=your_openai_api_key
   
   # GitHub integration for resume suggestions
   GITHUB_USERNAME=your_github_username
   GITHUB_TOKEN=your_github_personal_access_token
   ```

3. Development:
   ```bash
   npm start
   ```

## Features

### Resume Enhancement with GitHub Projects

The application includes a RAG (Retrieval-Augmented Generation) pipeline that:

1. Automatically fetches your GitHub repositories in the background
2. Analyzes job descriptions against your projects and experience
3. Generates tailored resume improvement suggestions
4. Highlights relevant projects, skills, and experience

This feature requires:
- `GITHUB_USERNAME` - Your GitHub username
- `GITHUB_TOKEN` - A personal access token with `repo` scope (create at https://github.com/settings/tokens)
- `OPENAI_API_KEY` - For enhanced AI-powered suggestions (optional, falls back to rule-based suggestions)

## Tech Stack

- Frontend: React, TailwindCSS
- Backend: Electron, SQLite
- Language: TypeScript
- Build: Vite, electron-builder
- AI: OpenAI API, RAG pipeline

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
