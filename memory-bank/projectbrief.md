# Job Tracker - Project Brief

## Project Overview
Job Tracker is a desktop application built with Electron that helps users manage their job applications through an organized, filterable dashboard. The application automatically ingests job applications from external sources, with local-first storage and optional Supabase synchronization capabilities.

## Core Requirements

### Essential Features
1. Automated Job Application Ingestion
   - Fetch/import jobs from external database/API sources
   - No manual job entry required
   - Background sync capabilities

2. Dashboard Interface
   - Filterable and sortable job listings
   - Status tracking
   - Company information display
   - Application deadlines

3. Job Management
   - Status updates
   - Deadline management
   - Note attachments
   - Reminder setting
   - Communication logging

4. Data Synchronization
   - Local-first SQLite storage
   - Optional Supabase cloud sync
   - Offline functionality
   - Multi-device access

### Technical Requirements
1. **Architecture**
   - Electron-based desktop application
   - React frontend
   - SQLite local database
   - Supabase integration

2. **Performance**
   - Responsive UI with large datasets
   - Efficient local data storage
   - Background sync processes
   - Offline-first functionality

3. **Security**
   - Supabase authentication (email/password)
   - Secure data storage
   - Protected API access

## Success Criteria
1. Users can view all their job applications in one dashboard
2. Automatic job import works reliably
3. All CRUD operations work offline
4. Data syncs correctly across devices
5. UI remains responsive with 1000+ job entries
6. Users can effectively track application status and progress

## Project Scope

### In Scope
- Automated job application ingestion
- Dashboard with filtering and sorting
- Job details editing
- Notes and reminders system
- Communication logging
- Local SQLite storage
- Supabase sync
- Offline functionality
- Basic authentication

### Out of Scope
- Manual job application entry
- Complex analytics
- Resume management
- Direct application submission
- Interview scheduling
- Multiple user collaboration
- Mobile applications 