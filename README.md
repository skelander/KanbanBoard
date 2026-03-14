# KanbanBoard

Vue 3 frontend for [KanbanApi](https://github.com/skelander/KanbanApi). Supports multi-user Kanban boards with drag-and-drop, WIP limits, and flow metrics (Work Item Age chart).

## Tech Stack

- Vue 3 + Vite + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite` plugin)
- vue-draggable-plus (drag-and-drop)
- Hash-based routing (`createWebHashHistory`) for GitHub Pages compatibility

## Prerequisites

- [Node.js 24+](https://nodejs.org/)

## Local Setup

```bash
git clone https://github.com/skelander/KanbanBoard.git
cd KanbanBoard
npm install
```

Create a `.env.local` to point at the local API:

```
VITE_API_URL=http://localhost:5000
```

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

## Views

| View | Route | Description |
|------|-------|-------------|
| LoginView | `/` | Login with username/password |
| BoardsView | `/boards` | List of boards; create new board (admin) |
| BoardView | `/boards/:id` | Kanban board with drag-and-drop and Analysis tab |

## Features

- **Kanban board** — drag cards within and between columns; WIP limits enforced (409 shown as error)
- **Work Item Age chart** — scatter plot (X = column, Y = days since leaving Backlog); click a dot to see card detail
- **Sprint navigation** — step through historical sprint snapshots in the Analysis tab
- **Test data** — admin can load multi-sprint, backlog, or mid-sprint seed data

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL for KanbanApi | `http://localhost:5000` |

## Deployment

Deployed to GitHub Pages via GitHub Actions (`deploy.yml`). Triggered on push to `main`. `VITE_API_URL` is injected at build time from the `API_URL` repository variable.

**Production URL:** https://skelander.github.io/KanbanBoard/
