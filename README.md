# API Playground

Frontend implementation of an **API Playground**: a simple tool for testing API
endpoints with visual feedback for request lifecycle stages, timeouts, and error states.

## Stack

| Area         | Choice                                                              |
| ------------ | ------------------------------------------------------------------- |
| Runtime / UI | React 19, TypeScript                                                |
| Build        | Vite 8                                                              |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`)                               |
| Components   | shadcn/ui (Radix primitives, CVA, `tailwind-merge`)                 |
| Icons        | HugeIcons (`@hugeicons/react`, `@hugeicons/core-free-icons`)        |
| Fonts        | Geist Variable (`@fontsource-variable/geist`, wired in `index.css`) |
| Quality      | ESLint 9 (flat config, `eslint.config.js`)                          |

Path alias: `@/*` → `src/`.

## Prerequisites

- **Node.js** LTS (20.x or 22.x) with matching npm
- Git

## Getting started

```bash
git clone <repository-url>
cd api-playground
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Dev server with HMR                |
| `npm run build`   | Type-check + production bundle     |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | ESLint over the workspace          |

## Decisions & tradeoffs

### State management — hook + context, no external library

All request lifecycle state lives in `useApiRequest`. The hook is exposed to the
component tree via `RequestContext` rather than prop-drilling. This keeps `App.tsx`
clean and makes the state layer replaceable. A Zustand slice could mirror the same
API so leaf components stay unchanged; adopting React Query would more likely touch
call sites (e.g. `RequestComposer`) because request triggers move to mutations /
queries.

`useState` was chosen over `useReducer` deliberately. The state shape is flat and
each transition updates a predictable set of fields. A reducer would add indirection
without simplifying the logic at this scale. The tradeoff is acknowledged: if the
number of lifecycle actions grew significantly, migrating to a reducer would be the
natural next step.

### Abort mechanism — countdown interval, abort timeout, one signal

Besides the 300ms “sending” delay (see below), two timed mechanisms share the
same `AbortSignal`: the timeout countdown (`setInterval`) and the abort trigger
(`setTimeout`). `setTimeout` is the single source of truth for when the request is
aborted — it fires at exactly `timeoutMs` milliseconds after `sendRequest` runs.
The `setInterval` countdown is a visual approximation only: it counts down once
per second and displays remaining time to the user, but it does not control abort
timing. The tradeoff is that the displayed countdown and the actual abort moment
can differ by up to one second. This was considered acceptable for a UI tool where
the countdown is informational, not a precision clock.

### 300ms sending stage delay

A 300ms delay separates the `sending` and `waiting` pipeline stages visually.
Without it, React batches the two `setState` calls and the `sending` stage is never
rendered — the pipeline jumps directly from `idle` to `waiting`. The delay is a
deliberate UX affordance, not a workaround: the spec defines `sending` and `waiting`
as distinct stages with distinct visual indicators, and this ensures both are visible.
The 300ms is included in the total timeout budget — a 5s timeout starts counting
from the moment `sendRequest` is called, not from when `waiting` begins.

### Mock service — AbortSignal contract

`mockFetch` mirrors the `fetch` contract at the `AbortSignal` boundary: the
simulated delay rejects with a `DOMException` with `name: 'AbortError'` if the
signal is aborted before the delay completes — the same shape real `fetch` uses when
aborted. Replacing `mockFetch` with `fetch` still requires a small adapter (call
`fetch(config.url, { method, body, signal, … })`, map `Response` → `ApiResponse`), but
the hook’s `try` / `catch` handling for `AbortError` stays the same. The mock also
returns a 500 response with 20% probability to exercise the error pipeline without
waiting for a timeout.

### URL validation — http and https only

The native `URL` constructor accepts any valid scheme including custom protocols
like `j:jj`. Since this tool is designed for HTTP API testing, validation explicitly
rejects any URL that does not use `http:` or `https:`. This reflects the actual use case
rather than accepting any syntactically valid URL.

### cancel vs error — separate state fields

`cancelledMessage` is kept separate from `error` rather than reusing the same
field with a sentinel value. Cancel and error are semantically different outcomes:
cancel transitions the pipeline to `idle`, error leaves it on `error`. Merging them
into one field would require the UI to parse string content to decide how to render
— brittle and hard to maintain. The tradeoff is one extra field in hook state, which
was considered acceptable given the clarity it provides.

### Response body formatting

`mockFetch` always returns JSON-serialisable objects, so `JSON.stringify` with
two-space indentation is used unconditionally. In a version backed by a real API,
this would branch on `Content-Type` — plain text, binary, and non-JSON responses
would each need different handling. That branching is omitted here because the
mock contract makes it unnecessary, not because it was overlooked.

## Known limitations

- The countdown display can lag the actual abort by up to one second due to
  `setInterval` drift — see Decisions above.
- `mockFetch` simulates network latency with a random 1–3s delay. In a real
  integration, replace `mockFetch` with `fetch` — the `AbortSignal` contract is
  identical.
- No automated tests. The highest-risk paths (timeout → abort, cancel → idle,
  unmount cleanup) were manually verified but would benefit from Vitest +
  React Testing Library with fake timers.
