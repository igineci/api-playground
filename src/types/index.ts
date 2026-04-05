/**
 * Core domain types for the API Playground.
 */

// erasableSyntaxOnly forbids enum — string union used instead
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Represents each stage of the request lifecycle pipeline.
 * idle → sending → waiting → success | error
 * cancel returns to idle from sending or waiting.
 */
export type PipelineStage = 'idle' | 'sending' | 'waiting' | 'success' | 'error';

export interface RequestConfig {
    url: string;
    method: HttpMethod;
    body?: string;
    timeoutSeconds: number;
}

export interface ApiResponse {
    status: number;
    statusText: string;
    // body typed as unknown rather than any forces explicit type checking before use
    body: unknown;
    durationMs: number;
}

export interface ValidationErrors {
    url?: string;
    timeoutSeconds?: string;
    body?: string;
}




