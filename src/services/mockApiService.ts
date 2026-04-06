import type { ApiResponse, RequestConfig } from "../types";

/**
 * Simulates network delay while respecting AbortSignal.
 */
function simulateDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    // removeEventListener needs a reference to the exact same function that was added
    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      reject(new DOMException("The operation was aborted", "AbortError"));
    };

    if (signal.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"));
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    timer = setTimeout(() => {
      // timer finished before abort, clean up the abort listener
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
  });
}

// helper function to build mock body based on request config
function buildMockBody(config: RequestConfig): unknown {
  switch (config.method) {
    case "GET":
      return {
        data: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      };
    case "POST":
      return {
        id: Math.floor(Math.random() * 1000),
        ...JSON.parse(config.body ?? "{}"),
        createdAt: new Date().toISOString(),
      };
    case "PUT":
      return {
        ...JSON.parse(config.body ?? "{}"),
        updatedAt: new Date().toISOString(),
      };
    case "DELETE":
      return { success: true, message: "Item deleted successfully" };
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

  // 20% chance of returning an error
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
    body: buildMockBody(config),
    durationMs: Date.now() - startTime,
  };
}
