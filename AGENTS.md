# AGENTS.md - Sprello

## Commands
- `npm run dev` — start dev server (port 4321)
- `npm run build` — static build to `dist/`
- No lint, test, or typecheck scripts exist

## Architecture
- Astro v4 static shell with a single React island (`client:only="react"`). No SSR, no routes.
- All state in `src/store/KanbanContext.tsx` — `useReducer` + `localStorage` under key `sprello-kanban-state`
- Theme state in `src/store/themeStore.tsx` — `localStorage` key `sprello-theme`
- Data hierarchy: `Sprint[] → List[] → Card[] → Task[] / Comment[]`
- All IDs are UUIDv4 via the `uuid` package

## Critical gotchas

### Theme CSS is inverted
`src/styles/theme.css` defines `:root` as dark colors and `.dark` as light colors — the OPPOSITE of the conventional pattern. `Layout.astro` hardcodes `class="dark"` on `<html>`. The `themeStore` default is `'dark'` (class present → light-ish look). Removing the class gives dark mode. Do not reverse this without updating all surface color references.

### List drag: element must stay in DOM
When dragging a list, the original column gets `invisible` (not removed from DOM) with a dashed placeholder overlay. Unmounting the drag source element **cancels the browser drag operation** — `dragover`/`drag` events stop firing.

### Drag systems are independent
- **List reorder**: custom state in `KanbanBoard` (`dragState` + `dragStateRef`), ghost preview, `findTargetList()` via `getBoundingClientRect()`, resolved on `document.dragend`
- **Card move**: standard HTML5 DnD in `CardItem` / `ListColumn`, data type `application/sprello-card`, cards append to end of target list (`toIndex: list.cards.length`). Cards cannot be reordered within the same list.

### Base path for GitHub Pages
`astro.config.mjs` has `base: '/sprello'`. All static asset references (favicon, etc.) must use the `/sprello/` prefix. The site deploys via `.github/workflows/deploy.yml` using `withastro/action@v3`.

### Sprint date overlap
`SprintModal.tsx` blocks dates already used by other sprints via `react-datepicker`'s `filterDate`. Overlap validation compares date ranges; sprints cannot share any calendar day.

### Locale
UI text and date formatting use Spanish (`es-ES`). Date picker placeholder text is in Spanish.

## File map
```
src/
├── pages/index.astro        # Entry point (only page)
├── layouts/Layout.astro     # HTML shell, CSS imports, dark class
├── components/
│   ├── App.tsx              # Root: ThemeProvider → KanbanProvider
│   ├── SprintSelector.tsx   # Top bar with sprint pills + theme toggle
│   ├── SprintModal.tsx      # Create/edit sprint (date pickers, overlap check)
│   ├── KanbanBoard.tsx      # List container + list drag orchestrator
│   ├── ListColumn.tsx       # Single column (cards, card drop target, grip)
│   ├── CardItem.tsx         # Draggable card
│   ├── CardModal.tsx        # Card detail: name, description, checklist, comments
│   └── ChecklistItem.tsx    # Single task (toggle + edit)
├── store/
│   ├── KanbanContext.tsx     # 20 action types, reducer, localStorage persistence
│   └── themeStore.tsx        # Theme context (dark/light toggle)
├── types/index.ts            # Task, Comment, Card, List, Sprint, KanbanState
└── styles/
    ├── theme.css             # CSS variables for surface palette (inverted)
    └── datepicker.css        # react-datepicker dark-mode overrides (scoped to .dark)
```
