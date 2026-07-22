import { useCallback, useState } from 'react';
import { useToast } from '@/context/ToastContext';

const HTTP_MESSAGES: Record<number, string> = {
  400: '', // use server message — it's already been made friendly
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested item could not be found.',
  409: '', // use server message — conflict reasons are context-specific
  500: 'Something went wrong on our end. Please try again.',
  503: 'Service temporarily unavailable. Please try again shortly.',
};

function extractMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'An unexpected error occurred. Please try again.';

  const msg = err.message;

  // api.ts throws "HTTP NNN" when the server returns no error body
  const httpMatch = msg.match(/^HTTP (\d+)$/);
  if (httpMatch) {
    const status = parseInt(httpMatch[1]);
    return HTTP_MESSAGES[status] || 'Something went wrong. Please try again.';
  }

  return msg;
}

/*
 * Returns [busy, call] where:
 *   busy — true while any call() is in flight
 *   call(fn) — runs fn(), shows an error toast on failure, returns result or null
 */
export function useServiceCall(): [boolean, <T>(fn: () => Promise<T>) => Promise<T | null>] {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setBusy(true);
      try {
        return await fn();
      } catch (err) {
        showError(extractMessage(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [showError],
  );

  return [busy, call];
}
