import path from "path";
import { SPLAT } from "triple-beam";
import safeStringify from "fast-safe-stringify";
import { ExtraErrorData } from "@sentry/integrations";
import DailyRotateFile from "winston-daily-rotate-file";
import SentryTransport from "winston-transport-sentry-node";
import { createLogger, format, transports } from "winston";

let pkg;
try {
  pkg = require(`${path.resolve("./package.json")}`);
} catch (e) {
  pkg = { version: "unknown" };
}

let identifier;
try {
  const config = require(`${path.resolve("./src/config.js")}`);
  identifier = config.identifier;
} catch (e) {
  identifier = "unknown";
}

const raw = format((info) => {
  // eslint-disable-next-line no-param-reassign
  info.raw = safeStringify(info, null, 2);

  return info;
});

const sentryTransport =
  process.env.NODE_ENV === "production"
    ? new SentryTransport({
        sentry: {
          dsn: process.env.SENTRY_DSN_AUTH_SERVICE,
          environment: process.env.NODE_ENV,
          serverName: identifier,
          attachStacktrace: true,
          tracesSampleRate: 1.0,
          release: pkg.version,
          integrations: [new ExtraErrorData({ depth: 10 })],
          normalizeDepth: 11,
        },
        format: raw(),
        level: "error",
      })
    : null;

const consoleTransport = new transports.Console({
  colorize: true,
  format: format.combine(
    format.simple(),
    format.printf((log) => {
      return `${format
        .colorize()
        .colorize(log.level, `${log.level}: ${log.message}`)}${
        log[SPLAT] ? `\n${safeStringify(log[SPLAT], null, 2)}` : ""
      }`;
    })
  ),
});

const transportsBasedOnEnv = [
  process.env.NODE_ENV === "production" ? sentryTransport : null,
  process.env.NODE_ENV === "development" ? consoleTransport : null,
].filter((x) => x);

export const { sentry } = sentryTransport || {};

export const logger = createLogger({
  // Using timestamp with format Date.now() instead of toISOString because of performances. See https://github.com/mcollina/the-cost-of-logging
  format: format.combine(
    format.ms(),
    format.timestamp({ format: () => Date.now() }),
    format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.resolve("./", "logs", "%DATE%-errors.log"),
      level: "error",
      datePattern: "DD-MM-YYYY",
      zippedArchive: true,
      maxSize: "20m",
    }),
    new DailyRotateFile({
      filename: path.resolve("./", "logs", "%DATE%-combined.log"),
      datePattern: "DD-MM-YYYY",
      zippedArchive: true,
      maxSize: "20m",
    }),
    ...transportsBasedOnEnv,
  ],
});

export default logger;
