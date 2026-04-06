import { useCallback, useEffect, useRef, useState } from "react";
import { mockFetch } from "../services/mockApiService";
import type { PipelineStage, ApiResponse, RequestConfig } from "../types";

/** How often we recompute seconds-left from the deadline (not the driver of abort). */
const COUNTDOWN_POLL_MS = 250;

function remainingSecondsFromDeadline(endsAt: number): number {
  return Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
}

interface UseApiRequestReturn {
  stage: PipelineStage;
  response: ApiResponse | null;
  error: string | null;
  cancelledMessage: string | null;
  countdown: number | null;
  sendRequest: (config: RequestConfig) => void;
  cancelRequest: () => void;
  reset: () => void;
}

export function useApiRequest(): UseApiRequestReturn {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // values that control behaviour but have no UI representation
  // refs don't trigger re-renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // tracked separately so clearTimers covers every exit path
  const sendingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ref mirrors stage so the Escape listener reads current value
  // without re-registering on every stage change
  const stageRef = useRef<PipelineStage>(stage);
  stageRef.current = stage;

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (countdownIdRef.current !== null) {
      clearInterval(countdownIdRef.current);
      countdownIdRef.current = null;
    }
    if (sendingDelayRef.current !== null) {
      clearTimeout(sendingDelayRef.current);
      sendingDelayRef.current = null;
    }
  }, []);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearTimers();
    setCountdown(null);
    // spec: cancel → idle
    setStage("idle");
    setError(null);
    // spec: display Request cancelled feedback
    setCancelledMessage("Request cancelled");
  }, [clearTimers]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    clearTimers();
    setStage("idle");
    setResponse(null);
    setError(null);
    setCountdown(null);
    setCancelledMessage(null);
  }, [clearTimers]);

  const sendRequest = useCallback(
    (config: RequestConfig) => {
      // abort any previous request
      abortControllerRef.current?.abort();
      clearTimers();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setResponse(null);
      setError(null);
      setCancelledMessage(null);
      setStage("sending");

      // Single deadline: same end moment for abort + UI. Uses monotonic clock so the
      // banner stays aligned with setTimeout even if wall-clock Date jumps.
      const timeoutMs = config.timeoutSeconds * 1000;
      const endsAt = performance.now() + timeoutMs;

      let lastDisplayedSeconds: number | null = null;

      const syncCountdownFromDeadline = () => {
        const sec = remainingSecondsFromDeadline(endsAt);
        if (sec !== lastDisplayedSeconds) {
          lastDisplayedSeconds = sec;
          setCountdown(sec);
        }
        if (sec <= 0 && countdownIdRef.current !== null) {
          clearInterval(countdownIdRef.current);
          countdownIdRef.current = null;
        }
      };

      syncCountdownFromDeadline();

      // Poll faster than 1s: if the main thread stalls or the tab is throttled, we still
      // jump to the correct second as soon as we get CPU again.
      const countdownId = setInterval(
        syncCountdownFromDeadline,
        COUNTDOWN_POLL_MS,
      );
      countdownIdRef.current = countdownId;

      timeoutIdRef.current = setTimeout(() => {
        controller.abort();
        clearTimers();
        setCountdown(null);
        setStage("error");
        setError("Request timed out");
      }, timeoutMs);

      // 300ms delay makes the sending stage visible in the pipeline
      sendingDelayRef.current = setTimeout(async () => {
        if (controller.signal.aborted) return;

        setStage("waiting");

        try {
          const result = await mockFetch(config, controller.signal);

          // guard against state updates after abort resolves the promise
          if (controller.signal.aborted) return;

          clearTimers();
          setCountdown(null);

          if (result.status >= 400) {
            setStage("error");
            setError(`Request failed: ${result.status} ${result.statusText}`);
            setResponse(result);
          } else {
            setStage("success");
            setResponse(result);
          }
        } catch (err) {
          // If aborted, cancel/timeout handler already set the correct state.
          // Updating state here would overwrite their work and cause flickering.
          if (err instanceof DOMException && err.name === "AbortError") return;

          clearTimers();
          setCountdown(null);
          setStage("error");
          setError(
            err instanceof Error ? err.message : "An unknown error occurred",
          );
        }
      }, 300);
    },
    [clearTimers],
  );

  // stageRef keeps the listener stable — no add/remove on every stage change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        (stageRef.current === "sending" || stageRef.current === "waiting")
      ) {
        cancelRequest();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelRequest]);

  // abort and clear on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      clearTimers();
    };
  }, [clearTimers]);

  return {
    stage,
    response,
    error,
    cancelledMessage,
    countdown,
    sendRequest,
    cancelRequest,
    reset,
  };
}
