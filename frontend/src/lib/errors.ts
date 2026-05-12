export interface FriendlyError {
  title: string;
  detail: string;
  retryable: boolean;
}

export function humanize(err: unknown): FriendlyError {
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      title: "Request cancelled",
      detail: "The request was cancelled before it finished.",
      retryable: true,
    };
  }
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";

  if (/Failed to fetch|NetworkError|TypeError: fetch/i.test(message)) {
    return {
      title: "Can't reach the server",
      detail:
        "The backend isn't responding. Make sure FastAPI is running on the configured API URL, then retry.",
      retryable: true,
    };
  }
  if (/401|unauthor/i.test(message)) {
    return {
      title: "Authentication failed",
      detail: "Your API keys may be missing or invalid. Check backend/.env.",
      retryable: false,
    };
  }
  if (/429|rate limit/i.test(message)) {
    return {
      title: "Rate limited",
      detail: "Too many requests in a short window. Wait a moment and try again.",
      retryable: true,
    };
  }
  if (/timeout/i.test(message)) {
    return {
      title: "Request timed out",
      detail: "The server took too long to respond. Try again in a moment.",
      retryable: true,
    };
  }
  if (/5\d\d/.test(message)) {
    return {
      title: "Server error",
      detail: "Something went wrong on the backend. Check the server logs.",
      retryable: true,
    };
  }
  return {
    title: "Something went wrong",
    detail: message.replace(/^Error:\s*/, "") || "Please try again.",
    retryable: true,
  };
}
