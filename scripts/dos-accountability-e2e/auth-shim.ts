/* Test shim: everything in the real auth module, except the ONE function that
   reads the session cookie. getDosWorkspaceAccess, canWriteDosActivity and
   the workspace scope loaders all stay real and still hit the database. */
export * from "../../src/lib/dos/auth";

export async function getDosAuthorization() {
  return (globalThis as Record<string, unknown>).__usa282Authorization__;
}
