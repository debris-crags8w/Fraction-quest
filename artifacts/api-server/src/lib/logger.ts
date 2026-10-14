import pino from "pino";
import { captureLog } from "./log-buffer";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  // Mirror every line into the admin dashboard's in-memory buffer (a whitelist of fields only).
  hooks: {
    logMethod(args, method, level) {
      try {
        const first = args[0] as unknown;
        if (first && typeof first === "object") captureLog(level, first as Record<string, any>, typeof args[1] === "string" ? args[1] : undefined);
        else captureLog(level, undefined, typeof first === "string" ? first : undefined);
      } catch {
        // Never let log capture break logging.
      }
      return method.apply(this, args as Parameters<typeof method>);
    },
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
