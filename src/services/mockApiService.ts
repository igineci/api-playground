import type { ApiResponse, RequestConfig } from "../types";

/**
 * Simulates network delay while respecting AbortSignal.
 * @throws {DOMException} with name "AbortError" if signal is aborted
 * before the delay completes
 */
function simulateDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const ref = {
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
    };

    // removeEventListener needs a reference to the exact same function that was added
    const onAbort = () => {
      if (ref.timer !== undefined) clearTimeout(ref.timer);
      reject(new DOMException("The operation was aborted", "AbortError"));
    };

    if (signal.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"));
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    ref.timer = setTimeout(() => {
      // timer finished before abort, clean up the abort listener
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
  });
}

/** Stable shape for invalid JSON on POST/PUT; hook treats status ≥400 as error with body. */
const INVALID_JSON_ERROR_BODY = {
  error: "Request body is not valid JSON",
  code: "INVALID_JSON" as const,
};

type BuildMockBodyResult = { ok: true; body: unknown } | { ok: false };

function buildMockBody(config: RequestConfig): BuildMockBodyResult {
  switch (config.method) {
    case "GET":
      return {
        ok: true,
        body: {
          data: [
            { id: 1, name: "Item 1" },
            { id: 2, name: "Item 2" },
          ],
        },
      };
    case "POST": {
      try {
        return {
          ok: true,
          body: {
            id: Math.floor(Math.random() * 1000),
            // body is undefined when user leaves textarea empty — treat as {}
            ...JSON.parse(config.body ?? "{}"),
            createdAt: new Date().toISOString(),
          },
        };
      } catch {
        return { ok: false };
      }
    }
    case "PUT": {
      try {
        return {
          ok: true,
          body: {
            ...JSON.parse(config.body ?? "{}"),
            updatedAt: new Date().toISOString(),
          },
        };
      } catch {
        return { ok: false };
      }
    }
    case "DELETE":
      return {
        ok: true,
        body: { success: true, message: "Item deleted successfully" },
      };
  }
}

/**
 * Mock implementation of fetch that simulates real network behavior.
 *
 * Responsibilities:
 *  - Simulate a random network delay (1000–3000ms)
 *  - Listen to AbortSignal and throw AbortError if aborted
 *  - Return a structured ApiResponse on success
 */
export async function mockFetch(
  config: RequestConfig,
  signal: AbortSignal,
): Promise<ApiResponse> {
  const startTime = Date.now();
  const delay = 1000 + Math.random() * 2000;

  await simulateDelay(delay, signal);

  const built = buildMockBody(config);
  if (!built.ok) {
    return {
      status: 400,
      statusText: "Bad Request",
      body: INVALID_JSON_ERROR_BODY,
      durationMs: Date.now() - startTime,
    };
  }

  // Simulates real-world server failures
  if (Math.random() < 0.2) {
    return {
      status: 500,
      statusText: "Internal Server Error",
      body: { error: "Something went wrong on the server" },
      durationMs: Date.now() - startTime,
    };
  }

  // 80% chance of returning a success
  return {
    status: 200,
    statusText: "OK",
    body: built.body,
    durationMs: Date.now() - startTime,
  };
}
