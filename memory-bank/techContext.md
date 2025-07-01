# Job Tracker - Technical Context

## Technology Stack

### Core Technologies
- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Programming language
- **SQLite**: Local database
- **Supabase**: Backend as a Service

### Frontend
- **Zustand**: State management
- **TailwindCSS**: Styling
- **React Query**: Data fetching
- **React Router**: Navigation
- **React Hook Form**: Form handling
- **date-fns**: Date manipulation

### Backend Services
- **better-sqlite3**: SQLite client
- **@supabase/supabase-js**: Supabase client
- **electron-store**: Configuration storage
- **node-cron**: Scheduled tasks
- **winston**: Logging

### Development Tools
- **Vite**: Build tool
- **electron-builder**: Application packaging
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Testing Library**: Component testing

## Development Setup

### Prerequisites
```bash
# Required software
Node.js >= 18.0.0
npm >= 9.0.0
Git

# Global packages
npm install -g electron-builder
```

### Project Structure
```
job-tracker/
├── package.json
├── vite.config.ts
├── electron.vite.config.ts
├── tsconfig.json
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Preload scripts
│   ├── renderer/       # React application
│   ├── shared/         # Shared types and utilities
│   └── database/       # Database schemas and migrations
├── resources/          # Application resources
└── release/           # Built applications
```

### Environment Variables
```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
NODE_ENV=development
DEBUG=job-tracker:*
```

### Development Commands
```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build application
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Technical Constraints

### Performance
- Maximum local database size: 5GB
- UI response time: < 100ms
- Background sync interval: 15 minutes
- Maximum concurrent operations: 10

### Security
- Local data encryption
- Secure token storage
- API rate limiting
- Input validation

### Offline Capability
- Full functionality without internet
- Automatic sync when online
- Conflict resolution
- Data persistence

### Cross-Platform
- Windows 10/11
- macOS 10.15+
- Linux (major distributions)

## Dependencies

### Production Dependencies
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "better-sqlite3": "^9.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.4.0",
    "react-query": "^5.0.0",
    "react-router-dom": "^6.21.0",
    "react-hook-form": "^7.49.0",
    "date-fns": "^3.0.0",
    "electron-store": "^8.1.0",
    "node-cron": "^3.0.0",
    "winston": "^3.11.0"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "vite": "^5.0.0",
    "electron-builder": "^24.9.0",
    "@types/react": "^18.2.0",
    "@types/better-sqlite3": "^7.6.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
```

## Build and Deployment

### Build Process
1. Compile TypeScript
2. Bundle React application
3. Package Electron application
4. Generate installers

### Deployment Targets
- Windows: `.exe`, `.msi`
- macOS: `.dmg`, `.pkg`
- Linux: `.AppImage`, `.deb`, `.rpm`

### Auto-Update Process
1. Check for updates on startup
2. Download in background
3. Install on application restart

## Monitoring and Logging

### Application Logs
- Error tracking
- Performance metrics
- User actions
- Sync status

### Metrics
- Application usage
- Error rates
- Sync success rate
- Performance data

## Database Management

### Migrations
- Version control
- Up/down scripts
- Data validation
- Backup strategy

### Optimization
- Index management
- Query optimization
- Regular maintenance
- Data cleanup 