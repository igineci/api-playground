# API Playground

Frontend scaffold for an **API Playground**: A simple tool for testing API endpoints with visual feedback for request lifecycle stages, timeouts, and error states.

## Stack

| Area         | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Runtime / UI | React 19, TypeScript                                          |
| Build        | Vite 8                                                        |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`), PostCSS (Autoprefixer) |
| Components   | shadcn/ui (Radix primitives, CVA, `tailwind-merge`)           |
| Icons        | HugeIcons                                                     |
| Fonts        | Geist Variable (`@fontsource-variable/geist`)                 |
| Quality      | ESLint 9 (flat config), Prettier                              |

Path alias: `@/*` → [`src/`](./src).

## Prerequisites

- **Node.js**: current LTS (e.g. **20.x** or **22.x**) and a matching **npm**.
- Git (to clone the repository).

## Getting started

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd api-playground
npm install
```

Start the development server (HMR enabled):

```bash
npm run dev
```

Open the URL printed in the terminal (default: [http://localhost:5173](http://localhost:5173)).

## Scripts

| Command           | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `npm run dev`     | Dev server via Vite                                                     |
| `npm run build`   | TypeScript project references build (`tsc -b`) + production Vite bundle |
| `npm run preview` | Serve the production build locally                                      |
| `npm run lint`    | ESLint over the workspace                                               |
| `npm run format`  | Prettier write                                                          |
