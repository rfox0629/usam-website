/**
 * Structured logging with secret redaction.
 *
 * Every log line is a single JSON object on stdout. No log line may contain a
 * secret: values are redacted by key name AND by shape before serialization.
 */

const SECRET_KEY_PATTERN =
  /(password|passphrase|secret|token|api[_-]?key|service[_-]?role|credential|authorization|bearer)/i;

// Shapes that look like credentials regardless of the key they arrive under.
const SECRET_VALUE_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\bsk_(live|test)_[A-Za-z0-9]{10,}/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /\blin_api_[A-Za-z0-9]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export const REDACTED = "[REDACTED]";

export function redact(value, keyHint = "") {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (keyHint && SECRET_KEY_PATTERN.test(keyHint)) return REDACTED;
    for (const p of SECRET_VALUE_PATTERNS) if (p.test(value)) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  return value;
}

export function createLogger({ job, stream = process.stdout, clock = () => new Date().toISOString() } = {}) {
  const emit = (level, event, fields = {}) => {
    const line = JSON.stringify({ ts: clock(), level, job, event, ...redact(fields) });
    stream.write(line + "\n");
    return line;
  };
  return {
    debug: (event, fields) => emit("debug", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
}
