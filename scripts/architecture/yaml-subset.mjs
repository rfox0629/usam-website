/**
 * Fail-closed YAML subset parser for the architecture manifests.
 *
 * WHY THIS EXISTS: the repository has no YAML dependency and the architecture
 * manifests must be validated in CI without adding one to a production web app.
 *
 * DESIGN RULE: this parser supports exactly the constructs used by
 * docs/architecture/*.yaml and THROWS on anything else. It never guesses.
 * A construct outside the subset produces a loud parse error, not a silent
 * mis-parse — so the failure mode is "malformed ownership configuration",
 * which is the sanctioned way for architecture validation to fail.
 *
 * Supported: comments, `key: value`, nested block maps, block sequences of
 * scalars and of maps, flow sequences `[a, b]`, flow maps `{a: 1}`, folded
 * block scalars `>-`, single/double quoted scalars, integers, booleans, null.
 *
 * NOT supported (throws): anchors/aliases, tags, multi-document streams,
 * literal block scalars `|`, flow nesting deeper than one level, merge keys.
 */

export class YamlSubsetError extends Error {
  constructor(message, line) {
    super(line == null ? message : `line ${line}: ${message}`);
    this.name = "YamlSubsetError";
    this.line = line;
  }
}

const UNSUPPORTED = [
  [/^\s*%/, "directives (%YAML/%TAG)"],
  [/^---\s*$/, "multi-document streams"],
  [/(^|\s)[&*][A-Za-z0-9_-]+/, "anchors and aliases"],
  [/(^|\s)!!?[A-Za-z]/, "explicit tags"],
  [/:\s*\|\s*[-+]?\s*$/, "literal block scalars (use >- instead)"],
  [/^\s*<<\s*:/, "merge keys"],
];

function scalar(raw, lineNo) {
  const t = raw.trim();
  if (t === "" || t === "~" || t === "null") return null;
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^'([^']*)'$/.test(t)) return t.slice(1, -1);
  if (/^"([^"]*)"$/.test(t)) return t.slice(1, -1);
  if (t.startsWith("[")) {
    if (!t.endsWith("]")) throw new YamlSubsetError("unterminated flow sequence", lineNo);
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    if (inner.includes("[") || inner.includes("{"))
      throw new YamlSubsetError("nested flow collections are not supported", lineNo);
    return inner.split(",").map((p) => scalar(p, lineNo));
  }
  if (t.startsWith("{")) {
    if (!t.endsWith("}")) throw new YamlSubsetError("unterminated flow mapping", lineNo);
    const inner = t.slice(1, -1).trim();
    if (inner === "") return {};
    if (inner.includes("[") || inner.includes("{"))
      throw new YamlSubsetError("nested flow collections are not supported", lineNo);
    const out = {};
    for (const pair of inner.split(",")) {
      const i = pair.indexOf(":");
      if (i === -1) throw new YamlSubsetError(`flow mapping entry missing ':' → ${pair}`, lineNo);
      out[scalar(pair.slice(0, i), lineNo)] = scalar(pair.slice(i + 1), lineNo);
    }
    return out;
  }
  return t;
}

/**
 * Strip a trailing `# comment` that is outside any quoted span.
 * Only a `#` preceded by whitespace starts a comment, per YAML.
 */
function stripTrailingComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** Tokenize into {indent, content, lineNo}, dropping comments and blank lines. */
function tokenize(text) {
  const rows = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    for (const [re, what] of UNSUPPORTED) {
      if (re.test(line)) throw new YamlSubsetError(`unsupported construct: ${what}`, lineNo);
    }
    const indent = line.length - line.replace(/^\s*/, "").length;
    if (line.includes("\t")) throw new YamlSubsetError("tabs are not permitted in YAML indentation", lineNo);
    const content = stripTrailingComment(line).trim();
    if (content === "") continue;
    rows.push({ indent, content, lineNo, raw: line });
  }
  return rows;
}

/** Consume a folded block scalar (`>-`) starting after `startIdx`. */
function foldedScalar(rows, startIdx, parentIndent) {
  const parts = [];
  let i = startIdx;
  while (i < rows.length && rows[i].indent > parentIndent) {
    parts.push(rows[i].content);
    i++;
  }
  return { value: parts.join(" ").trim(), next: i };
}

function parseBlock(rows, start, indent) {
  // Decide map vs sequence by the first row at this indent.
  if (start >= rows.length) return { value: null, next: start };
  const isSeq = rows[start].content.startsWith("- ") || rows[start].content === "-";
  return isSeq ? parseSeq(rows, start, indent) : parseMap(rows, start, indent);
}

function parseSeq(rows, start, indent) {
  const out = [];
  let i = start;
  while (i < rows.length && rows[i].indent === indent) {
    const row = rows[i];
    if (!row.content.startsWith("-")) break;
    const after = row.content.replace(/^-\s*/, "");
    if (after === ">-" || after === ">") {
      // sequence item that is a folded block scalar
      const folded = foldedScalar(rows, i + 1, row.indent);
      out.push(folded.value);
      i = folded.next;
      continue;
    }
    if (after === "") {
      // "- " then an indented block on following lines
      const inner = parseBlock(rows, i + 1, rows[i + 1]?.indent ?? indent + 2);
      out.push(inner.value);
      i = inner.next;
      continue;
    }
    if (/^[A-Za-z0-9_'"./-]+\s*:/.test(after)) {
      // sequence item that is a map; synthesize a virtual row set
      const virtualIndent = row.indent + 2;
      const virtual = [{ indent: virtualIndent, content: after, lineNo: row.lineNo, raw: row.raw }];
      let j = i + 1;
      while (j < rows.length && rows[j].indent > row.indent) {
        virtual.push(rows[j]);
        j++;
      }
      const inner = parseMap(virtual, 0, virtualIndent);
      out.push(inner.value);
      i = j;
      continue;
    }
    out.push(scalar(after, row.lineNo));
    i++;
  }
  return { value: out, next: i };
}

function parseMap(rows, start, indent) {
  const out = {};
  let i = start;
  while (i < rows.length && rows[i].indent === indent) {
    const row = rows[i];
    if (row.content.startsWith("- ")) break;
    const m = row.content.match(/^('[^']*'|"[^"]*"|[^:]+?)\s*:\s*(.*)$/);
    if (!m) throw new YamlSubsetError(`expected 'key: value' → ${row.content}`, row.lineNo);
    const key = String(scalar(m[1], row.lineNo));
    const rest = m[2];

    if (rest === ">-" || rest === ">") {
      const folded = foldedScalar(rows, i + 1, row.indent);
      out[key] = folded.value;
      i = folded.next;
      continue;
    }
    if (rest === "") {
      const nextRow = rows[i + 1];
      if (!nextRow || nextRow.indent <= row.indent) {
        out[key] = null;
        i++;
        continue;
      }
      const inner = parseBlock(rows, i + 1, nextRow.indent);
      out[key] = inner.value;
      i = inner.next;
      continue;
    }
    out[key] = scalar(rest, row.lineNo);
    i++;
  }
  return { value: out, next: i };
}

export function parseYamlSubset(text) {
  const rows = tokenize(text);
  if (rows.length === 0) return {};
  const baseIndent = rows[0].indent;
  const { value, next } = parseBlock(rows, 0, baseIndent);
  if (next !== rows.length) {
    throw new YamlSubsetError(
      `unconsumed content — indentation is inconsistent at or before this line`,
      rows[next].lineNo,
    );
  }
  return value;
}
