/**
 * Resolves the app's "@/" path alias and extensionless imports for regression
 * scripts. Node strips the TypeScript types itself, so this hook only has to
 * fix specifier resolution.
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

function withExtension(absolutePath) {
  if (existsSync(absolutePath)) return absolutePath;
  for (const candidate of [`${absolutePath}.ts`, `${absolutePath}.tsx`, `${absolutePath}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return absolutePath;
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    return next(pathToFileURL(withExtension(resolvePath(process.cwd(), specifier.slice(2)))).href, context);
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const base = dirname(fileURLToPath(context.parentURL));
    const absolute = withExtension(resolvePath(base, specifier));
    if (existsSync(absolute)) {
      return next(pathToFileURL(absolute).href, context);
    }
  }

  return next(specifier, context);
}
