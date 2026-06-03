/**
 * Discriminated Result type for service-layer return values.
 *
 * Convention across all modules: service functions return Result<T, AppError>
 * instead of throwing. Throwing is for *unexpected* (programmer-bug) failures;
 * Result is for *expected* failures (validation, not-found, conflict, etc.)
 * that the UI must respond to differently than a 500.
 *
 * Usage:
 *   const r = await projects.publish(input);
 *   if (!r.ok) return notify.error(r.error.message);
 *   return r.value;
 */

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Common error shape used by services. Each module can extend `code`. */
export type AppError = {
  code:
    | "validation"
    | "unauthorized"
    | "not_found"
    | "conflict"
    | "forbidden"
    | "rate_limited"
    | "external_error"
    | "internal";
  message: string;
  /** Optional structured details for the UI (form field errors, etc.). */
  details?: Record<string, unknown>;
};

export const fail = (
  code: AppError["code"],
  message: string,
  details?: AppError["details"],
): Result<never, AppError> => ({ ok: false, error: { code, message, details } });
