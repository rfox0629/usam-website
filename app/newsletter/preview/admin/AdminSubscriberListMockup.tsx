"use client";

import { useMemo, useState } from "react";
import { newsletterAdminSubscriberSamples } from "@/src/data/newsletter-fixtures";

const font = { rajdhani: "'Rajdhani', sans-serif" };

const statusStyles: Record<string, string> = {
  bounced: "border-red-900/50 bg-red-950/40 text-red-300",
  subscribed: "border-usam-success/25 bg-usam-success/10 text-usam-success",
  unsubscribed: "border-stone-700 bg-stone-900 text-stone-400",
};

export function AdminSubscriberListMockup() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "bounced" | "subscribed" | "unsubscribed">("all");

  const rows = useMemo(() => {
    return newsletterAdminSubscriberSamples.filter((row) => {
      const matchesQuery = query.trim().length === 0
        || row.name.toLowerCase().includes(query.toLowerCase())
        || row.email.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  return (
    <div className="rounded-2xl border border-stone-800/70 bg-white/[0.02] p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="min-h-11 w-full max-w-xs rounded-xl border border-stone-700 bg-[#0D0D0D] px-4 text-sm text-stone-100 placeholder:text-stone-500 focus:border-usam-gold focus:outline-none"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email…"
          type="text"
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "subscribed", "unsubscribed", "bounced"] as const).map((option) => (
            <button
              className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                statusFilter === option
                  ? "border-usam-gold bg-usam-gold/15 text-usam-gold"
                  : "border-stone-700 text-stone-400 hover:border-stone-500"
              }`}
              key={option}
              onClick={() => setStatusFilter(option)}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 text-[11px] uppercase tracking-[0.14em] text-stone-500">
              <th className="pb-3 pr-4 font-semibold">Subscriber</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 pr-4 font-semibold">Topics</th>
              <th className="pb-3 pr-4 font-semibold">Frequency</th>
              <th className="pb-3 pr-4 font-semibold">Joined</th>
              <th className="pb-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-stone-900" key={row.email}>
                <td className="py-3 pr-4">
                  <p className="font-semibold text-stone-100">{row.name}</p>
                  <p className="text-xs text-stone-500">{row.email}</p>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] ${statusStyles[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1.5">
                    {row.topics.map((topic) => (
                      <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[10px] text-stone-400" key={topic}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-4 text-stone-400">{row.frequency}</td>
                <td className="py-3 pr-4 text-stone-400">{row.joinedAt}</td>
                <td className="py-3">
                  <div className="flex gap-3 text-xs">
                    <button className="text-usam-gold hover:underline" type="button">View</button>
                    <button className="text-stone-400 hover:text-stone-200 hover:underline" type="button">Resend Confirmation</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-sm text-stone-500" colSpan={6}>No subscribers match this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
