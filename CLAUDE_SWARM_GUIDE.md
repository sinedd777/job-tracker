# Claude Swarm Setup for Job Tracker

## Overview
This project now includes a Claude Swarm configuration with a specialized frontend agent for glass morphism UI development.

## Usage

### Starting the Swarm
```bash
claude-swarm start claude-swarm.yml
```

This will launch:
- **Main Orchestrator**: Coordinates development tasks across agents
- **Frontend Specialist**: Expert in React, TypeScript, TailwindCSS, and glass morphism design

### Agent Capabilities

#### Frontend Specialist
- **Specializations**: React, TypeScript, TailwindCSS, Glass Morphism
- **Focus Areas**: 
  - Component architecture and reusability
  - Glass morphism design implementation
  - Accessibility and responsive design
  - Dark/light mode theming
  - Performance optimization

#### Tools Available
- File operations (read, write, search)
- Code search and analysis
- Multi-file editing
- Terminal commands (orchestrator only)
- Memory bank updates

### Glass Morphism Design System

#### Available CSS Classes
```css
/* Base Glass Components */
.glass              /* Standard glass effect */
.glass-dark         /* Dark mode glass effect */
.glass-card         /* Glass card component */
.glass-surface      /* Subtle glass surface */

/* Buttons */
.btn-glass          /* Glass button */
.btn-primary        /* Enhanced primary button */
.btn-secondary      /* Glass secondary button */

/* Inputs */
.input-glass        /* Glass input field */

/* Navigation */
.nav-glass          /* Glass navigation */
.sidebar-glass      /* Glass sidebar */

/* Status Colors */
.glass-success      /* Success state */
.glass-warning      /* Warning state */
.glass-error        /* Error state */
.glass-info         /* Info state */
```

#### Custom Tailwind Utilities
- `backdrop-blur-*` variations (xs, 4xl, 5xl)
- `backdrop-saturate-*` (25, 75, 125, 150, 200)
- Glass shadows: `shadow-glass`, `shadow-glass-sm`, `shadow-glass-lg`
- Glass colors: `bg-glass-white`, `bg-glass-black` (with variations)

### Session Management

#### List Previous Sessions
```bash
claude-swarm list-sessions
```

#### Restore a Session
```bash
claude-swarm restore <session-id>
```

#### View Session Details
```bash
claude-swarm show <session-id>
```

## Development Workflow

1. **Start Swarm**: `claude-swarm start`
2. **Task the Frontend Agent**: Use the orchestrator to delegate UI tasks
3. **Leverage Specialization**: The frontend agent knows your tech stack and glass morphism requirements
4. **Iterate**: Agents can work together or independently as needed

## Example Tasks for Frontend Agent

- "Implement glass morphism on the sidebar component"
- "Create a glass card design for job listings"
- "Add subtle animations to glass elements"
- "Improve the layout accessibility"
- "Optimize component performance"
- "Create reusable glass form components"

## Configuration Notes

- **Session Persistence**: Automatically enabled
- **Tool Permissions**: Carefully configured for security
- **Model**: Using Claude 3.5 Sonnet for both agents
- **Working Directory**: Project root for both agents

## Troubleshooting

- Ensure Claude CLI is installed and authenticated
- Check that claude-swarm.yml is in the project root
- Verify all tool permissions if you modify the config
- Use `claude-swarm ps` to see active sessions
- Use `claude-swarm clean` to clean up old sessions