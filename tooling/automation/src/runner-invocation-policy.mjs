function argsIncludePair(args, key, value) {
  return args.some((arg, index) => arg === key && args[index + 1] === value);
}

function insertBeforeJson(args, extraArgs) {
  const next = [...args];
  const jsonIndex = next.lastIndexOf("--json");
  if (jsonIndex >= 0) {
    next.splice(jsonIndex, 0, ...extraArgs);
    return next;
  }

  return [...next, ...extraArgs];
}

export function codexArgsForAuthorization(args, authorization, options = {}) {
  const standaloneArgs = [];

  if (options.skipGitRepoCheck && !args.includes("--skip-git-repo-check")) {
    standaloneArgs.push("--skip-git-repo-check");
  }

  if (authorization?.allowed !== true) {
    return standaloneArgs.length ? insertBeforeJson(args, standaloneArgs) : [...args];
  }

  const pairs = [
    ["-c", "approval_policy=\"never\""],
    ["-c", "sandbox_workspace_write.network_access=true"],
  ];

  if (options.metadataPath) {
    pairs.push(["--add-dir", options.metadataPath]);
  }

  const missingArgs = pairs
    .filter(([key, value]) => !argsIncludePair(args, key, value))
    .flat();
  const extraArgs = [...standaloneArgs, ...missingArgs];

  return extraArgs.length ? insertBeforeJson(args, extraArgs) : [...args];
}

export function claudeArgsForAuthorization(args, authorization) {
  const next = [...args];
  if (authorization?.allowed !== true) {
    return next;
  }

  const modeIndex = next.indexOf("--permission-mode");
  if (modeIndex >= 0 && modeIndex + 1 < next.length) {
    next[modeIndex + 1] = "bypassPermissions";
    return next;
  }

  return [...next, "--permission-mode", "bypassPermissions"];
}
