"use client";

import { useEffect, useState } from "react";
import { adminFont } from "./AdminUI";

const roleOptions = [
  "Admin",
  "Organization Admin",
  "Workspace Leader",
  "Disciple Maker",
] as const;

type RolePreview = typeof roleOptions[number];

const storageKey = "usam-command-center-role-preview";

export function RolePreviewSelect() {
  const [role, setRole] = useState<RolePreview>("Admin");

  useEffect(() => {
    const savedRole = window.localStorage.getItem(storageKey);

    if (roleOptions.includes(savedRole as RolePreview)) {
      setRole(savedRole as RolePreview);
    }
  }, []);

  function updateRole(nextRole: RolePreview) {
    setRole(nextRole);
    window.localStorage.setItem(storageKey, nextRole);
  }

  return (
    <label className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-stone-800 bg-[#080808] px-3 text-xs text-stone-400">
      <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        Viewing as
      </span>
      <select
        aria-label="Role preview"
        className="min-h-8 appearance-none rounded-md border border-stone-700 bg-stone-950 px-2 text-xs font-semibold text-stone-100 outline-none transition-colors hover:border-[#C9A24A] focus:border-[#C9A24A]"
        onChange={(event) => updateRole(event.target.value as RolePreview)}
        value={role}
      >
        {roleOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <span className="text-[10px] uppercase tracking-[0.14em] text-stone-600" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        Preview only
      </span>
    </label>
  );
}
