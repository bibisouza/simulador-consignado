export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
}

const write = (level: "info" | "warn", event: string, fields?: LogFields) =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level, event, ...fields }));

export const consoleLogger: Logger = {
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
};

export const silentLogger: Logger = { info: () => {}, warn: () => {} };