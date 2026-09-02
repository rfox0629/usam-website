/**
 * The share-card system holds, or link previews quietly rot.
 *
 * Three things have gone wrong here before and are cheap to catch:
 *
 *   1. A page hard-codes a photo as its social image, and every link unfurls as
 *      the same generic landscape.
 *   2. A page declares `openGraph.images` — even as `undefined` — which
 *      suppresses the `opengraph-image.tsx` file convention, and the link
 *      unfurls with no picture at all.
 *   3. An internal route gets a card carrying its own name. The image route is
 *      public even when the page behind it is not.
 *
 *   node scripts/share-card-system-regression.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function read(path) {
  return readFileSync(path, "utf8");
}

/**
 * These checks look for patterns that also appear in the comments warning about
 * them, so the prose has to come out first or the file that explains the trap is
 * the file that trips the check.
 */
function code(path) {
  return read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

function walk(dir, matcher, found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      walk(path, matcher, found);
    } else if (matcher(path)) {
      found.push(path);
    }
  }

  return found;
}

// --- one renderer, and the fonts it needs ------------------------------------

check(existsSync("src/lib/share/share-card.tsx"), "The share card renderer must exist.");
check(existsSync("src/lib/share/share-image.ts"), "The opengraph-image helper must exist.");
check(
  existsSync("public/fonts/share/oswald-semibold.ttf") && existsSync("public/fonts/share/oswald-medium.ttf"),
  "Oswald must stay vendored: Satori cannot fetch a webfont at render time.",
);
check(existsSync("public/fonts/share/OFL.txt"), "The vendored font must ship its license.");

const shareCard = read("src/lib/share/share-card.tsx");

check(
  !/backgroundImage|url\(/.test(shareCard),
  "The share card must stay typographic. No photography, no image fields.",
);
check(shareCard.includes("#FCFAF6"), "The share card must keep the warm off-white field.");

// --- the site-wide default ---------------------------------------------------

check(existsSync("app/opengraph-image.tsx"), "The app root must carry the site-wide default card.");
check(
  read("app/layout.tsx").includes('shareImage: "file"'),
  "The root layout must ask for the file convention so app/opengraph-image.tsx applies to every route.",
);
check(
  !code("app/layout.tsx").includes("images"),
  "The root layout must leave `images` out so app/opengraph-image.tsx applies to every route.",
);

// --- nothing points at a retired photo card ----------------------------------

const sources = walk("app", (path) => path.endsWith(".tsx") || path.endsWith(".ts")).concat(
  walk("src", (path) => path.endsWith(".tsx") || path.endsWith(".ts")),
);

for (const path of sources) {
  const source = code(path);

  check(
    !source.includes("/images/share/"),
    `${relative(".", path)} points at a retired static share image. Cards are generated now.`,
  );
  check(
    !source.includes("groups-share.png"),
    `${relative(".", path)} points at the retired Groups campaign artwork.`,
  );
  check(
    !/images:\s*undefined/.test(source),
    `${relative(".", path)} sets \`images: undefined\`, which suppresses opengraph-image.tsx and unfurls with no picture. Leave the key out.`,
  );
}

// --- internal routes must not name themselves in a public image --------------

const internalPrefixes = [
  "app/admin/",
  "app/auth/",
  "app/dos/",
  "app/login/",
  "app/missionary-intake/",
  "app/operations/",
  "app/partners/",
  "app/review/",
  "app/system/preview/",
  "app/testimony/",
  "app/update-password/",
  "app/vision/",
];

for (const path of walk("app", (candidate) => candidate.endsWith("opengraph-image.tsx"))) {
  const owner = internalPrefixes.find((prefix) => path.startsWith(prefix));

  check(
    !owner,
    `${relative(".", path)} gives an internal route its own share card. Let it inherit the generic default.`,
  );
}

// --- private surfaces still say noindex --------------------------------------

const mustNotIndex = [
  "app/admin/layout.tsx",
  "app/login/page.tsx",
  "app/missionary-intake/page.tsx",
  "app/operations/layout.tsx",
  "app/partners/page.tsx",
  "app/prayer/apply/page.tsx",
  "app/system/preview/page.tsx",
  "app/vision/page.tsx",
];

for (const path of mustNotIndex) {
  check(read(path).includes("index: false"), `${path} must stay noindex.`);
}

check(
  read("src/lib/dos/brand-metadata.ts").includes("noIndex: true"),
  "DOS app surfaces under usamissionaries.org must stay noindex, matching robots.txt.",
);

if (failures.length) {
  for (const failure of failures) {
    console.error(`  ✗ ${failure}`);
  }

  throw new Error(`share-card system regression: ${failures.length} check(s) failed.`);
}

console.log("share-card system regression passed.");
