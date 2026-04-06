export const MIN_TIMEOUT = 1;
export const MAX_TIMEOUT = 300;

export function validateUrl(url: string): string | undefined {
  if (!url.trim()) return "URL is required";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
  } catch {
    return "URL must be a valid format (e.g. https://api.example.com)";
  }
}

export function validateTimeout(timeout: string): string | undefined {
  const num = Number(timeout);
  if (!timeout.trim() || isNaN(num)) return "Timeout must be a number";
  if (!Number.isInteger(num)) return "Timeout must be a whole number";
  if (num < MIN_TIMEOUT || num > MAX_TIMEOUT)
    return `Timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT} seconds`;
}

/** When POST/PUT: empty body is OK (mock treats undefined as {}). Non-empty must parse as JSON. */
export function validateJsonBody(body: string): string | undefined {
  const trimmed = body.trim();
  if (trimmed === "") return undefined;
  try {
    JSON.parse(trimmed);
  } catch (e) {
    const hint =
      e instanceof SyntaxError && e.message
        ? `Invalid JSON: ${e.message}`
        : "Body must be valid JSON";
    return hint;
  }
}
