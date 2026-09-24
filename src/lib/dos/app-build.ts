/* USA-283 follow-up: which build is this page running?
 *
 * The DOS app is installed on the Home Screen, and an installed iOS web app
 * keeps whatever JavaScript it loaded the first time. It is not a browser
 * tab: it has no address bar to pull down, resuming it does not reload, and
 * iOS may keep the same process alive for days. So a leader can be looking at
 * a months-old screen while the server has been redeployed many times, and
 * nothing on screen says so. That is how the old Groups page survived a
 * deploy that had already replaced it.
 *
 * The server stamps every render with the deployment it came from. The client
 * compares that against the live value and reloads when they differ.
 */

export function dosAppBuildId() {
  const id = process.env.VERCEL_DEPLOYMENT_ID
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ?? "";

  return id.trim() || "development";
}

/* A short, readable form for the "you are running…" line in More. */
export function dosAppBuildLabel(buildId: string) {
  const id = buildId.trim();

  if (!id || id === "development") {
    return "development";
  }

  return id.startsWith("dpl_") ? id.slice(4, 12) : id.slice(0, 7);
}
