const LEVELS = { debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const;
type Level = keyof typeof LEVELS;

const COLORS: Record<Level, string> = {
  debug: '\x1b[34m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[41m\x1b[37m',
};
const KEY_COLOR = '\x1b[35m';
const MSG_COLOR = '\x1b[36m';
const RESET = '\x1b[39m';
const FULL_RESET = '\x1b[0m';

const threshold = LEVELS[(process.env.LOG_LEVEL as Level) || 'info'] ?? LEVELS.info;

function formatErr(err: unknown): string {
  if (err instanceof Error) {
    return `{ type: "${err.constructor.name}", message: "${err.message}", stack: ${err.stack} }`;
  }
  return JSON.stringify(err);
}

// Strip values whose key looks secret-y so a stray `log.info('...', { secret })`
// doesn't end up in the disk log. Walks nested objects via JSON.stringify's
// replacer so {meta:{token:'abc'}} also gets redacted.
const REDACT_KEY = /^(secret|token|password|api[_-]?key|authorization|bearer|cookie|set-cookie)$/i;
function redactReplacer(key: string, value: unknown): unknown {
  if (REDACT_KEY.test(key) && typeof value === 'string') {
    return `[redacted:len=${value.length}]`;
  }
  return value;
}

function formatData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (k === 'err') {
      parts.push(`${KEY_COLOR}${k}${RESET}=${formatErr(v)}`);
    } else if (REDACT_KEY.test(k) && typeof v === 'string') {
      parts.push(`${KEY_COLOR}${k}${RESET}="[redacted:len=${v.length}]"`);
    } else {
      parts.push(`${KEY_COLOR}${k}${RESET}=${JSON.stringify(v, redactReplacer)}`);
    }
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

function ts(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function emit(level: Level, msg: string, data?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const tag = `${COLORS[level]}${level.toUpperCase()}${level === 'fatal' ? FULL_RESET : RESET}`;
  const stream = LEVELS[level] >= LEVELS.warn ? process.stderr : process.stdout;
  stream.write(`[${ts()}] ${tag} ${MSG_COLOR}${msg}${RESET}${data ? formatData(data) : ''}\n`);
}

export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
  fatal: (msg: string, data?: Record<string, unknown>) => emit('fatal', msg, data),
};

process.on('uncaughtException', (err) => {
  log.fatal('Uncaught exception', { err });
  process.exit(1);
});

// Symmetric with uncaughtException so a missed `.catch()` on a fire-and-forget
// promise gets the same systemd-restart treatment instead of leaking a dangling
// rejection nobody observes. The codebase relies on `void`/`.catch` discipline
// elsewhere — make a violation loud rather than silent.
process.on('unhandledRejection', (reason) => {
  log.fatal('Unhandled rejection', { err: reason });
  process.exit(1);
});
