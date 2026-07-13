"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { adminFont, AdminBadge } from "../../admin/_components/AdminUI";
import {
  disableFinanceTeamMemberAction,
  inviteFinanceTeamMemberAction,
  reenableFinanceTeamMemberAction,
  updateFinanceTeamMemberRoleAction,
} from "./team-actions";
import { financeRoleLabels, financeRoles, type FinanceRole } from "@/src/lib/finance-ops/roles";
import type { FinanceTeamMember } from "@/src/lib/finance-ops/team";

const fieldClassName =
  "mt-1.5 w-full border border-stone-800 bg-black/40 px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#C9A24A] disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function FinanceTeamPanel({
  canManage,
  members,
  writeEnabled,
}: {
  canManage: boolean;
  members: readonly FinanceTeamMember[];
  writeEnabled: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsInviting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await inviteFinanceTeamMemberAction(String(formData.get("email") ?? ""), formData.get("financeRole") as FinanceRole);
      formRef.current?.reset();
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not invite.");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(id: string, financeRole: FinanceRole) {
    setBusyId(id);

    try {
      await updateFinanceTeamMemberRoleAction(id, financeRole);
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not update role.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleDisabled(member: FinanceTeamMember) {
    setBusyId(member.id);

    try {
      if (member.disabledAt) {
        await reenableFinanceTeamMemberAction(member.id);
      } else {
        await disableFinanceTeamMemberAction(member.id);
      }
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : "Could not update member.");
    } finally {
      setBusyId(null);
    }
  }

  if (!canManage) {
    return (
      <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Finance Team
        </h2>
        <p className="mt-2 text-sm text-stone-400">Only the Finance Owner can manage Finance team membership.</p>
      </section>
    );
  }

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Finance Team
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        People invited here get Finance department access only — never broader <code className="text-stone-300">/admin</code> or other
        NCC departments — via a separate permission table (<code className="text-stone-300">finance_team_members</code>), independent of
        the global admin role model.
      </p>

      {!writeEnabled ? (
        <p className="mt-3 text-sm text-stone-500">
          Unavailable in this preview until the finance_team_members migration is applied.
        </p>
      ) : null}

      <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={handleInvite} ref={formRef}>
        <input className={fieldClassName} disabled={!writeEnabled} name="email" placeholder="Email address" required type="email" />
        <select className={fieldClassName} defaultValue="bookkeeper" disabled={!writeEnabled} name="financeRole">
          {financeRoles.map((role) => (
            <option key={role} value={role}>
              {financeRoleLabels[role]}
            </option>
          ))}
        </select>
        <button
          className="inline-flex min-h-10 items-center justify-center border border-transparent bg-[#D4A63D] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isInviting || !writeEnabled}
          style={{ fontFamily: adminFont.rajdhani }}
          type="submit"
        >
          {isInviting ? "Inviting..." : "Invite"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {members.length === 0 ? (
        <p className="mt-5 text-sm text-stone-500">No Finance team members yet.</p>
      ) : (
        <div className="mt-5 divide-y divide-stone-900 border border-stone-800/75">
          {members.map((member) => (
            <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between" key={member.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-100">{member.email}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                  Invited {formatDate(member.invitedAt)} by {member.invitedBy} &middot; Last access {formatDate(member.lastAccessAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {member.disabledAt ? <AdminBadge tone="muted">Disabled</AdminBadge> : <AdminBadge tone="green">Active</AdminBadge>}
                <select
                  className="min-h-8 border border-stone-800 bg-black/40 px-2 text-xs text-stone-100 outline-none focus:border-[#C9A24A]"
                  disabled={busyId === member.id}
                  onChange={(event) => handleRoleChange(member.id, event.target.value as FinanceRole)}
                  value={member.financeRole}
                >
                  {financeRoles.map((role) => (
                    <option key={role} value={role}>
                      {financeRoleLabels[role]}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyId === member.id}
                  onClick={() => handleToggleDisabled(member)}
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {member.disabledAt ? "Re-enable" : "Disable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
