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
git clone https://github.com/igineci/api-playground.git
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
| `npm run test`    | Run tests                          |

## Decisions & tradeoffs

### State management — hook + context, no external library

All request lifecycle state lives in `useApiRequest`. The hook is exposed to the
component tree via `RequestContext`.

`useState` was chosen over `useReducer` deliberately. The state shape is flat and
each transition updates a predictable set of fields. A reducer would add indirection
without simplifying the logic at this scale. The tradeoff is acknowledged: if the
number of lifecycle actions grew significantly, migrating to a reducer would be the
natural next step.

### Timeout, abort, and countdown — one deadline

When a request starts, the hook records a single monotonic deadline:
`endsAt = performance.now() + timeoutSeconds * 1000`.

- **Abort timing:** One `setTimeout(timeoutMs)` schedules `controller.abort()` and
  moves the pipeline to **Error** with a timeout message. That timer is the only thing
  that decides when a request is aborted for exceeding the configured limit.
- **Countdown UI:** Remaining time is derived from the **same** `endsAt` using whole
  seconds (`ceil` of seconds left, clamped at 0). React state updates only when that
  integer changes, so the label changes at most once per second while still matching
  the assignment requirement for a per-second countdown.
- **Refresh loop:** A short interval (`COUNTDOWN_POLL_MS`, 250ms in code) recomputes
  from `endsAt`. It does **not** schedule the abort; it keeps the displayed second
  aligned after tab throttling or long tasks. If the main thread stalls, seconds may
  appear to jump, but they stay tied to the same deadline as the abort timer.

Using `performance.now()` for the deadline keeps the banner and `setTimeout` aligned
even if wall-clock time jumps (e.g. NTP). The countdown is not a separate clock with
its own drift budget.

### 300ms sending stage delay

A 300ms delay separates the `sending` and `waiting` pipeline stages visually.
Without it, React batches the two `setState` calls and the `sending` stage is never
rendered — the pipeline jumps directly from `idle` to `waiting`. The delay is a
deliberate UX affordance, not a workaround: the spec defines `sending` and `waiting`
as distinct stages with distinct visual indicators, and this ensures both are visible.
The 300ms is included in the total timeout budget — a 5s timeout starts counting
from the moment `sendRequest` is called, not from when `waiting` begins.

### Mock service

**AbortSignal:** `simulateDelay` rejects with a `DOMException` named `AbortError` if
the signal aborts before the simulated network wait finishes — the same shape as
`fetch` when aborted. Swapping in real `fetch` still needs an adapter (`fetch(url, {
method, body, signal, … })`, map `Response` → `ApiResponse`), but the hook’s
`AbortError` handling stays valid.

**Latency:** The mock uses a random delay between 1s and 3s so “waiting” is visible
without a real server.

**HTTP errors:** About 20% of successful-delay completions return HTTP 500 so the
Error stage and error UI can be exercised without waiting for a timeout. That is
intentional — an API playground that always returns 200 cannot demonstrate the full
error pipeline.

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

### Response display — beyond the minimal spec

The spec defines response display for successful requests only.
`ResponseDisplay` also renders when the hook stores a response
for non-2xx status codes (e.g. a 500 with a body), because an
API playground that hides error response bodies would be
incomplete as a debugging tool. This is a deliberate extension
of the spec, not a misread.

### Response body formatting

`mockFetch` always returns JSON-serialisable objects, so `JSON.stringify` with
two-space indentation is used unconditionally. In a version backed by a real API,
this would branch on `Content-Type` — plain text, binary, and non-JSON responses
would each need different handling. That branching is omitted here because the
mock contract makes it unnecessary, not because it was overlooked.

## Known limitations

- **Mock timing:** Simulated latency is random (1–3s) and independent of the entered
  URL. Very short timeouts can abort before the mock finishes even when the “server”
  would have responded in time. Replace `mockFetch` with `fetch` for real network
  behaviour; the `AbortSignal` usage stays the same.
- **Mock errors:** Random 500 responses make success vs error non-deterministic in
  manual testing unless you change or disable that branch.
- **Timeout budget:** The 300ms `sending` → `waiting` transition counts against the
  configured timeout (see Decisions).
- **Response panel:** Formatting assumes JSON-serialisable bodies from the mock. A
  production tool would inspect headers (`Content-Type`) and handle text, binary, and
  large payloads differently.
