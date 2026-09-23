import { existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const realAuth = pathToFileURL(resolvePath(process.cwd(), "src/lib/dos/auth.ts")).href;
const shim = pathToFileURL(resolvePath(process.cwd(), "scripts/dos-accountability-delete-e2e/auth-shim.ts")).href;

function withExtension(absolutePath) {
  if (existsSync(absolutePath)) return absolutePath;
  for (const candidate of [`${absolutePath}.ts`, `${absolutePath}.tsx`, `${absolutePath}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return absolutePath;
}

export async function resolve(specifier, context, next) {
  let url = null;

  if (specifier === "server-only" || specifier === "client-only") {
    return next(pathToFileURL(resolvePath(process.cwd(), "scripts/dos-accountability-delete-e2e/server-only.mjs")).href, context);
  }

  /* next 16 ships no "exports" map, so bare subpaths like "next/server" need
     their extension the way the bundler would add it. */
  if (specifier.startsWith("next/") && existsSync(resolvePath(process.cwd(), "node_modules", `${specifier}.js`))) {
    return next(pathToFileURL(resolvePath(process.cwd(), "node_modules", `${specifier}.js`)).href, context);
  }

  if (specifier.startsWith("@/")) {
    url = pathToFileURL(withExtension(resolvePath(process.cwd(), specifier.slice(2)))).href;
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const absolute = withExtension(resolvePath(dirname(fileURLToPath(context.parentURL)), specifier));
    if (existsSync(absolute)) url = pathToFileURL(absolute).href;
  }

  // The shim itself must reach the real module, or it would import itself.
  if (url === realAuth && context.parentURL !== shim) {
    return next(shim, context);
  }

  return url ? next(url, context) : next(specifier, context);
}
