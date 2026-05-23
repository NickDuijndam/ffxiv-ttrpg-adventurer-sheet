# FFXIV TTRPG Adventurer Sheet (React + TypeScript + Vite)

Editable single-page app inspired by the official blank FFXIV TTRPG adventurer sheet layout.

## Tech Stack

- React 18
- TypeScript (strict mode)
- Vite
- Tailwind CSS

## Features

- Fully editable character sheet fields
- Desktop-first parchment sheet layout (tablet-safe responsive behavior)
- Local auto-save with `localStorage`
- Reset sheet with confirmation
- JSON export/import
- Optional dark mode toggle
- Reusable form and panel components

## Project Structure

```text
.
├─ index.html
├─ package.json
├─ postcss.config.cjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
├─ vite.config.ts
└─ src
   ├─ App.tsx
   ├─ index.css
   ├─ main.tsx
   ├─ vite-env.d.ts
   ├─ components
   │  ├─ form
   │  │  ├─ AutosizeTextarea.tsx
   │  │  └─ Field.tsx
   │  └─ layout
   │     └─ Panel.tsx
   ├─ types
   │  └─ sheet.ts
   └─ utils
      └─ storage.ts
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Notes

- Use the top toolbar for share/export/import/reset/dark mode.
- The sheet auto-saves shortly after any edit.

## GitHub Pages Deployment

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that builds and deploys the app to GitHub Pages.

1. Push the project to GitHub.
2. In GitHub, open `Settings -> Pages`.
3. Under **Build and deployment**, set **Source** to `GitHub Actions`.
4. Push to `main` (or `master`) to trigger deployment.

The workflow builds with:

```bash
npm run build -- --base "/<repository-name>/"
```

So assets resolve correctly for project pages URLs like:

`https://<username>.github.io/<repository-name>/`
