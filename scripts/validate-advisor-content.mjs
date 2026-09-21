#!/usr/bin/env node
// Validates a private advisor briefing JSON file against the schema in
// src/lib/advisor-content.ts, without ever printing its contents.
//
//   node scripts/validate-advisor-content.mjs /path/to/advisor-private-content.json
//
// Point it at a file OUTSIDE this repository. The payload is private and must
// never be committed.

import { readFileSync } from "node:fs";

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim().length > 0;
const optText = (v) => v === undefined || typeof v === "string";
const isTextArray = (v) => Array.isArray(v) && v.every((i) => typeof i === "string");

const errors = [];
const fail = (path, message) => errors.push(`${path}: ${message}`);

function checkBlock(block, path) {
  if (!isRecord(block) || typeof block.type !== "string") {
    return fail(path, "must be an object with a string 'type'");
  }

  switch (block.type) {
    case "paragraph":
      if (!isText(block.text)) fail(path, "'text' is required");
      break;
    case "bullets":
    case "steps":
      if (!isTextArray(block.items) || block.items.length === 0) fail(path, "'items' must be a non-empty string array");
      break;
    case "quote":
      if (!isText(block.text)) fail(path, "'text' is required");
      if (!optText(block.attribution)) fail(path, "'attribution' must be a string");
      break;
    case "figures":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        fail(path, "'items' must be a non-empty array");
      } else {
        block.items.forEach((figure, i) => {
          const at = `${path}.items[${i}]`;
          if (!isRecord(figure)) return fail(at, "must be an object");
          if (!isText(figure.label)) fail(at, "'label' is required");
          if (!isText(figure.value)) fail(at, "'value' is required");
          if (!optText(figure.note)) fail(at, "'note' must be a string");
          if (!figure.note) {
            console.warn(`  warning ${at}: no 'note' — distinct financial measures should say what they mean`);
          }
        });
      }
      break;
    case "table":
      if (!isTextArray(block.columns) || block.columns.length === 0) fail(path, "'columns' must be a non-empty string array");
      if (!Array.isArray(block.rows) || !block.rows.every(isTextArray)) {
        fail(path, "'rows' must be an array of string arrays");
      } else {
        block.rows.forEach((row, i) => {
          if (Array.isArray(block.columns) && row.length !== block.columns.length) {
            fail(`${path}.rows[${i}]`, `has ${row.length} cells, expected ${block.columns.length}`);
          }
        });
      }
      break;
    case "callout":
      if (!isText(block.text)) fail(path, "'text' is required");
      if (block.tone !== undefined && !["neutral", "gold", "warning"].includes(block.tone)) {
        fail(path, "'tone' must be neutral, gold, or warning");
      }
      break;
    case "questions":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        fail(path, "'items' must be a non-empty array");
      } else {
        block.items.forEach((q, i) => {
          if (!isRecord(q) || !isText(q.prompt)) fail(`${path}.items[${i}]`, "'prompt' is required");
        });
      }
      break;
    case "tabs":
      if (!Array.isArray(block.tabs) || block.tabs.length === 0) {
        fail(path, "'tabs' must be a non-empty array");
      } else {
        block.tabs.forEach((tab, i) => {
          const at = `${path}.tabs[${i}]`;
          if (!isRecord(tab)) return fail(at, "must be an object");
          if (!isText(tab.id)) fail(at, "'id' is required");
          if (!isText(tab.label)) fail(at, "'label' is required");
          if (!Array.isArray(tab.blocks)) return fail(at, "'blocks' must be an array");
          tab.blocks.forEach((b, j) => checkBlock(b, `${at}.blocks[${j}]`));
        });
      }
      break;
    case "links":
      if (!Array.isArray(block.groups) || block.groups.length === 0) {
        fail(path, "'groups' must be a non-empty array");
      } else {
        block.groups.forEach((group, i) => {
          const at = `${path}.groups[${i}]`;
          if (!isRecord(group)) return fail(at, "must be an object");
          if (!isText(group.title)) fail(at, "'title' is required");
          if (!Array.isArray(group.links)) return fail(at, "'links' must be an array");
          group.links.forEach((link, j) => {
            const linkAt = `${at}.links[${j}]`;
            if (!isRecord(link)) return fail(linkAt, "must be an object");
            if (!isText(link.label)) fail(linkAt, "'label' is required");
            if (!isText(link.href)) fail(linkAt, "'href' is required");
          });
        });
      }
      break;
    case "dashboard": {
      const d = block.dashboard;
      const at = `${path}.dashboard`;
      if (!isRecord(d)) return fail(at, "must be an object");
      if (!isText(d.org)) fail(at, "'org' is required");
      if (!optText(d.view)) fail(at, "'view' must be a string");
      if (!optText(d.caption)) fail(at, "'caption' must be a string");
      if (d.metrics !== undefined) {
        if (!Array.isArray(d.metrics)) fail(`${at}.metrics`, "must be an array");
        else d.metrics.forEach((m, i) => {
          const mAt = `${at}.metrics[${i}]`;
          if (!isRecord(m)) return fail(mAt, "must be an object");
          if (!isText(m.label)) fail(mAt, "'label' is required");
          if (!isText(m.value)) fail(mAt, "'value' is required");
        });
      }
      if (d.panels !== undefined) {
        if (!Array.isArray(d.panels)) fail(`${at}.panels`, "must be an array");
        else d.panels.forEach((pn, i) => {
          const pAt = `${at}.panels[${i}]`;
          if (!isRecord(pn)) return fail(pAt, "must be an object");
          if (!isText(pn.title)) fail(pAt, "'title' is required");
          if (!Array.isArray(pn.rows)) return fail(pAt, "'rows' must be an array");
          pn.rows.forEach((r, j) => {
            const rAt = `${pAt}.rows[${j}]`;
            if (!isRecord(r)) return fail(rAt, "must be an object");
            if (!isText(r.label)) fail(rAt, "'label' is required");
            if (!isText(r.value)) fail(rAt, "'value' is required");
          });
        });
      }
      if (d.progress !== undefined) {
        if (!Array.isArray(d.progress)) fail(`${at}.progress`, "must be an array");
        else d.progress.forEach((pr, i) => {
          const prAt = `${at}.progress[${i}]`;
          if (!isRecord(pr)) return fail(prAt, "must be an object");
          if (!isText(pr.label)) fail(prAt, "'label' is required");
          if (typeof pr.value !== "number") fail(prAt, "'value' must be a number");
          if (typeof pr.max !== "number" || pr.max <= 0) fail(prAt, "'max' must be a positive number");
        });
      }
      if (!d.metrics && !d.panels && !d.progress) {
        fail(at, "needs at least one of metrics, panels, or progress");
      }
      break;
    }
    default:
      fail(path, `unknown block type '${block.type}'`);
  }
}

function checkContent(content) {
  if (!isRecord(content)) return fail("root", "must be an object");
  if (!isRecord(content.meta) || !isText(content.meta.title)) fail("meta", "'title' is required");

  if (!Array.isArray(content.sections) || content.sections.length === 0) {
    return fail("sections", "must be a non-empty array");
  }

  const seen = new Set();

  content.sections.forEach((section, i) => {
    const at = `sections[${i}]`;
    if (!isRecord(section)) return fail(at, "must be an object");
    if (!isText(section.id)) fail(at, "'id' is required");
    else if (seen.has(section.id)) fail(at, `duplicate id '${section.id}'`);
    else seen.add(section.id);
    if (!isText(section.navLabel)) fail(at, "'navLabel' is required");
    if (!isText(section.heading)) fail(at, "'heading' is required");
    if (section.variant !== undefined && !["plain", "panel", "feature"].includes(section.variant)) {
      fail(at, "'variant' must be plain, panel, or feature");
    }
    if (!Array.isArray(section.blocks)) return fail(at, "'blocks' must be an array");
    section.blocks.forEach((block, j) => checkBlock(block, `${at}.blocks[${j}]`));
  });
}

// Em-dashes read as machine-written prose. Flag them so they can be rewritten
// at the source rather than patched over at render time.
function warnOnEmDashes(node, path = "") {
  if (typeof node === "string") {
    if (node.includes("\u2014")) emDashPaths.push(path);
    return;
  }
  if (Array.isArray(node)) return node.forEach((v, i) => warnOnEmDashes(v, `${path}[${i}]`));
  if (isRecord(node)) return Object.entries(node).forEach(([k, v]) => warnOnEmDashes(v, path ? `${path}.${k}` : k));
}

const emDashPaths = [];

const [, , filePath] = process.argv;

if (!filePath) {
  console.error("usage: node scripts/validate-advisor-content.mjs <path-to-json>");
  process.exit(2);
}

let parsed;

try {
  parsed = JSON.parse(readFileSync(filePath, "utf8"));
} catch (error) {
  // Deliberately reports only the reason, never the file's contents.
  console.error(`Could not read or parse ${filePath}: ${error.message}`);
  process.exit(1);
}

checkContent(parsed);
warnOnEmDashes(parsed);

if (emDashPaths.length > 0) {
  console.warn(`\n  warning: ${emDashPaths.length} string(s) contain an em-dash (U+2014):`);
  emDashPaths.slice(0, 20).forEach((path) => console.warn(`    - ${path}`));
  if (emDashPaths.length > 20) console.warn(`    ... and ${emDashPaths.length - 20} more`);
  console.warn("  These read as machine-written. Rewrite the sentences rather than swapping the character.\n");
}

if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s) found:\n`);
  errors.forEach((message) => console.error(`  - ${message}`));
  process.exit(1);
}

const sectionCount = Array.isArray(parsed.sections) ? parsed.sections.length : 0;
console.log(`OK — valid advisor briefing content (${sectionCount} sections).`);
console.log("Encode with:  base64 -w0 <file>");
