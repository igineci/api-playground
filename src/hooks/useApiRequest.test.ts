import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApiRequest } from "./useApiRequest";
import { mockFetch } from "../services/mockApiService";
import type { ApiResponse, RequestConfig } from "../types";

vi.mock("../services/mockApiService", () => ({
  mockFetch: vi.fn(),
}));

const mockFetchFn = vi.mocked(mockFetch);

const defaultConfig: RequestConfig = {
  url: "https://api.example.com/items",
  method: "GET",
  timeoutSeconds: 2,
};

describe("useApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("timeout → abort → error stage (countdown cleared, no response)", async () => {
    vi.useFakeTimers();
    // Never resolving proves timeout wins the race: if fetch resolved first, we'd wrongly
    // mark success and this test would fail the product requirement that slow servers are bounded.
    mockFetchFn.mockImplementation(() => new Promise<ApiResponse>(() => {}));

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({ ...defaultConfig, timeoutSeconds: 2 });
    });

    expect(result.current.stage).toBe("sending");

    await act(async () => {
      // Matches user-facing deadline: timeout is scheduled from sendRequest (not from waiting),
      // so advancing 2000ms is the authoritative way to fire the abort path under fake time.
      vi.advanceTimersByTime(2000);
    });
    // waitFor uses real timers and deadlocks under vi.useFakeTimers(); flush React updates explicitly.
    await act(async () => {
      await Promise.resolve();
    });

    // Terminal stage gates which panel renders; must be error, not a stuck waiting spinner.
    expect(result.current.stage).toBe("error");
    // Error copy is the contract for UI and retry messaging; wrong text breaks dashboards.
    expect(result.current.error).toBe("Request timed out");
    // Countdown must clear on terminal failure so we never show a live timer beside an error.
    expect(result.current.countdown).toBeNull();
    // No partial response should appear when the request never completed successfully.
    expect(result.current.response).toBeNull();
  });

  it("cancel → idle, cancelledMessage set, error and countdown cleared", async () => {
    vi.useFakeTimers();
    mockFetchFn.mockImplementation(() => new Promise<ApiResponse>(() => {}));

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest(defaultConfig);
    });

    await act(async () => {
      // Stay in sending (before the 300ms pipeline delay) so cancel exercises the same paths as
      // a user bailing during the brief "sending" state, not only after "waiting".
      vi.advanceTimersByTime(100);
    });

    expect(["sending", "waiting"]).toContain(result.current.stage);

    act(() => {
      result.current.cancelRequest();
    });

    // Idle is the only stage that matches "nothing in flight" for the composer UI.
    expect(result.current.stage).toBe("idle");
    // Cancel is intentionally not an error — separate field preserves UX semantics.
    expect(result.current.cancelledMessage).toBe("Request cancelled");
    expect(result.current.error).toBeNull();
    expect(result.current.countdown).toBeNull();
  });

  it("Escape key while in flight → same outcome as cancelRequest", async () => {
    vi.useFakeTimers();
    mockFetchFn.mockImplementation(() => new Promise<ApiResponse>(() => {}));

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest(defaultConfig);
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(["sending", "waiting"]).toContain(result.current.stage);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    // Keyboard path must stay equivalent to explicit cancel so accessibility users get parity.
    expect(result.current.stage).toBe("idle");
    expect(result.current.cancelledMessage).toBe("Request cancelled");
  });

  it("successful request → success stage with response, no error, countdown cleared", async () => {
    vi.useFakeTimers();
    const successResponse: ApiResponse = {
      status: 200,
      statusText: "OK",
      body: { data: [] },
      durationMs: 500,
    };
    mockFetchFn.mockResolvedValue(successResponse);

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({
        ...defaultConfig,
        timeoutSeconds: 60,
      });
    });

    await act(async () => {
      // Required: hook waits 300ms before entering waiting; skipping this leaves stage stuck on sending.
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.stage).toBe("success");
    // Full ApiResponse is what ResponseDisplay binds to; reference equality is not required but shape must match.
    expect(result.current.response).toEqual(successResponse);
    expect(result.current.error).toBeNull();
    expect(result.current.countdown).toBeNull();
  });

  it("countdown decrements every second", async () => {
    vi.useFakeTimers();
    mockFetchFn.mockImplementation(() => new Promise<ApiResponse>(() => {}));

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({
        ...defaultConfig,
        timeoutSeconds: 5,
      });
    });

    // Mirrors initial timeoutSeconds — if this were wrong, the banner would lie about time left.
    expect(result.current.countdown).toBe(5);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Interval is 1000ms; one tick must shave exactly one second off the display.
    expect(result.current.countdown).toBe(4);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.countdown).toBe(3);
  });

  it("reset clears all state back to idle", async () => {
    vi.useFakeTimers();
    const successResponse: ApiResponse = {
      status: 200,
      statusText: "OK",
      body: { data: [] },
      durationMs: 500,
    };
    mockFetchFn.mockResolvedValue(successResponse);

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({
        ...defaultConfig,
        timeoutSeconds: 60,
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.stage).toBe("success");
    expect(result.current.response).toEqual(successResponse);

    act(() => {
      result.current.reset();
    });

    // After success, reset must return the composer to a blank slate so the next run does not show stale JSON or timers.
    expect(result.current.stage).toBe("idle");
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.countdown).toBeNull();
    // reset() also clears cancel feedback; leftover text would confuse users starting a new request.
    expect(result.current.cancelledMessage).toBeNull();
  });

  it("unmount cleanup aborts in-flight work and avoids post-unmount state updates", async () => {
    vi.useFakeTimers();
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    mockFetchFn.mockImplementation(() => new Promise<ApiResponse>(() => {}));

    const { result, unmount } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({ ...defaultConfig, timeoutSeconds: 30 });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.stage).toBe("waiting");
    const stageBeforeUnmount = result.current.stage;

    unmount();

    // Cleanup must call abort so underlying fetch/listeners stop; missing abort leaks work and race conditions.
    expect(abortSpy).toHaveBeenCalled();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // If async completion wrongly called setState after teardown, stage could flip (e.g. success/error);
    // matching last committed stage is stable across React warning wording changes.
    expect(result.current.stage).toBe(stageBeforeUnmount);
  });

  it("new sendRequest while previous is active aborts the first and completes the second", async () => {
    vi.useFakeTimers();

    const successResponse: ApiResponse = {
      status: 200,
      statusText: "OK",
      body: { data: [] },
      durationMs: 10,
    };

    const firstRequest = { signal: null as AbortSignal | null };

    mockFetchFn
      .mockImplementationOnce((_config, signal) => {
        firstRequest.signal = signal;
        return new Promise<ApiResponse>(() => {});
      })
      .mockImplementationOnce(() => Promise.resolve(successResponse));

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({ ...defaultConfig, timeoutSeconds: 60 });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(firstRequest.signal).not.toBeNull();
    const firstSignal = firstRequest.signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      result.current.sendRequest({ ...defaultConfig, timeoutSeconds: 60 });
    });

    // First request must be aborted when superseded; otherwise two responses could race the same UI slot.
    expect(firstSignal.aborted).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.stage).toBe("success");
    expect(result.current.response).toEqual(successResponse);
    expect(mockFetchFn).toHaveBeenCalledTimes(2);
  });

  it("non-2xx response → error stage, error contains status, response kept for display", async () => {
    vi.useFakeTimers();
    const errorResponse: ApiResponse = {
      status: 500,
      statusText: "Internal Server Error",
      body: {},
      durationMs: 100,
    };
    mockFetchFn.mockResolvedValue(errorResponse);

    const { result } = renderHook(() => useApiRequest());

    act(() => {
      result.current.sendRequest({ ...defaultConfig, timeoutSeconds: 30 });
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.stage).toBe("error");
    // Status code must appear in error message for user to understand what failed
    expect(result.current.error).toContain("500");
    // Same object as mockFetch return — kept on error so ResponseDisplay can show status/body for failed calls
    expect(result.current.response).toEqual(errorResponse);
  });
});
