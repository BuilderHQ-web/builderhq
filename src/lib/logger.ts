/**
 * Structured logger.
 *
 * Phase 0: a thin console wrapper that emits JSON-shaped lines, so logs
 * are immediately greppable in dev and parseable in prod.
 * Phase 1+: drop-in replace with Axiom / Better Stack — every module
 * already imports from here, so no callsite changes needed.
 *
 * Convention: always pass an object as the first arg, message as the
 * second. Pretty in dev, structured in prod.
 *   logger.info({ userId, projectId, event: "project.published" }, "published");
 */

type Level = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, fields: Record<string, unknown>, message: string) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };
  if (isProd) {
    // structured JSON for log aggregators
    console[level === "debug" ? "log" : level](JSON.stringify(entry));
  } else {
    console[level === "debug" ? "log" : level](`[${level}] ${message}`, fields);
  }
}

export const logger = {
  debug: (fields: Record<string, unknown>, message: string) => emit("debug", fields, message),
  info: (fields: Record<string, unknown>, message: string) => emit("info", fields, message),
  warn: (fields: Record<string, unknown>, message: string) => emit("warn", fields, message),
  error: (fields: Record<string, unknown>, message: string) => emit("error", fields, message),
};
