import "server-only";

export const WORKSPACE_SHELL_V2_FLAG = "workspace_shell_v2";
export const WORKSPACE_SHELL_V2_ENV = "WORKSPACE_SHELL_V2_ENABLED";

function isEnabled(value: string | undefined) {
  return ["1", "on", "true", "yes"].includes(value?.trim().toLowerCase() ?? "");
}

export function isWorkspaceShellV2Enabled() {
  return isEnabled(process.env[WORKSPACE_SHELL_V2_ENV]);
}
