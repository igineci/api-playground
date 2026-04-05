import { useCallback, useEffect, useRef, useState } from "react";
import { mockFetch } from "../services/mockApiService";
import type { PipelineStage, ApiResponse, RequestConfig } from "../types";

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

      // start the countdown and timeout timer
      const timeoutMs = config.timeoutSeconds * 1000;
      setCountdown(config.timeoutSeconds);

      // countdown is visual only — does not control abort timing
      countdownIdRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownIdRef.current!);
            return 0;
          };
          return prev - 1;
        });
      }, 1000);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (stage === "sending" || stage === "waiting")) {
        cancelRequest();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage, cancelRequest]);

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
