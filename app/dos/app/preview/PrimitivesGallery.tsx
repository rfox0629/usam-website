"use client";

import { useState } from "react";
import { Chip, ChipGroup, Field, HelperLine, StickyPrimary, Stepper, ToggleRow, fieldControlClass } from "@/src/components/dos/forms/primitives";
import { Avatar, Button, Card, EmptyState, Eyebrow, IconTile, PageHeader, PillRail, Row, SearchField, Segmented, StatusPill } from "@/src/components/dos/ui";
import { Icon } from "@/src/components/dos/Icon";

/**
 * Gallery of the shared DOS primitives in their states (USA-215). Reached only
 * through the token-gated demo route (`/dos/app/preview?demo=…&gallery=primitives`)
 * and used by scripts/dos-visual-regression.mjs to screenshot the foundation
 * in isolation. Synthetic content only; nothing here touches data.
 */
export function PrimitivesGallery() {
  const [rail, setRail] = useState<"overview" | "walk" | "growth" | "purpose" | "faithfulness">("overview");
  const [segment, setSegment] = useState<"month" | "week">("month");
  const [duration, setDuration] = useState(75);
  const [prayed, setPrayed] = useState(true);
  const [search, setSearch] = useState("");
  const [chips, setChips] = useState<string[]>(["Tanner Kent"]);
  const formatDuration = (minutes: number) => (minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes}m`);

  return (
    <div className="dos-app-route mx-auto min-h-dvh w-full max-w-[430px] bg-white px-5 pb-dos-nav-clearance" data-gallery="primitives">
      <PageHeader action={<Button compact icon="settings" variant="secondary">Settings</Button>} lede="Every shared primitive, in its states." onBack={() => undefined} title="Primitives" />

      <Eyebrow count="5 variants">Buttons</Eyebrow>
      <div className="grid gap-2">
        <Button fullWidth icon="log" variant="primary">Log meeting</Button>
        <Button fullWidth variant="tinted">Fix 2 things to log</Button>
        <Button fullWidth variant="secondary">Schedule</Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="text">View all 5</Button>
          <Button variant="danger">Delete entry</Button>
          <Button compact variant="secondary">Compact</Button>
          <Button disabled variant="primary">Disabled</Button>
        </div>
      </div>

      <Eyebrow>Pill rail and segmented</Eyebrow>
      <PillRail
        label="My Record sections"
        onChange={setRail}
        options={[
          { label: "Overview", value: "overview" },
          { label: "Walk", value: "walk" },
          { label: "Growth", value: "growth" },
          { label: "Purpose", value: "purpose" },
          { label: "Faithfulness", value: "faithfulness" },
        ]}
        value={rail}
      />
      <div className="mt-3">
        <Segmented label="Calendar view" onChange={setSegment} options={[{ label: "Month", value: "month" }, { label: "Week", value: "week" }]} value={segment} />
      </div>

      <Eyebrow tone="sub">Status pills</Eyebrow>
      <div className="flex flex-wrap gap-2">
        <StatusPill>Logged</StatusPill>
        <StatusPill tone="blue">Scheduled</StatusPill>
        <StatusPill tone="amber">Overdue · Aug 30</StatusPill>
        <StatusPill tone="green">On track</StatusPill>
        <StatusPill tone="red">Error</StatusPill>
        <StatusPill tone="amber">A very long status label that must truncate</StatusPill>
      </div>

      <Eyebrow count="3">Rows</Eyebrow>
      <Row chevron leading={<Avatar name="Tanner Kent" />} onClick={() => undefined} primary="Tanner Kent" secondary="Discipling · My 3 · met 2 days ago" trailing={<StatusPill tone="green">On rhythm</StatusPill>} />
      <Row chevron leading={<Avatar name="Garrett Grahl" overdue />} onClick={() => undefined} primary="Garrett Grahl" secondary="Mentoring · My 12 · met 34 days ago" trailing={<StatusPill tone="amber">Overdue</StatusPill>} />
      <Row chevron leading={<IconTile><Icon name="meetings" size={18} /></IconTile>} onClick={() => undefined} primary="Wed, Sep 2 · 2:00 PM" secondary="Tanner Kent · Coffee · 2h 30m · prayed together · 1 fruit" />

      <Eyebrow>Cards</Eyebrow>
      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => undefined}>
          <span className="block text-dos-eyebrow uppercase text-dos-eyebrow">Last meeting</span>
          <span className="mt-1 block text-dos-body font-semibold text-dos-primary">Wed, Sep 2</span>
          <span className="block text-dos-meta text-dos-secondary">Coffee · 2h 30m</span>
        </Card>
        <Card onClick={() => undefined}>
          <span className="block text-dos-eyebrow uppercase text-dos-eyebrow">Upcoming</span>
          <span className="mt-1 block text-dos-body font-semibold text-dos-primary">Tue, Sep 8</span>
          <span className="block text-dos-meta text-dos-secondary">2:00 PM · Coffee</span>
        </Card>
      </div>

      <Eyebrow>Empty state and search</Eyebrow>
      <EmptyState action={<Button compact variant="tinted">Add person</Button>}>No people yet. Start with one name.</EmptyState>
      <SearchField label="Search your field" onChange={setSearch} placeholder="Search your field" value={search} />

      <Eyebrow>Form primitives</Eyebrow>
      <div className="grid gap-4">
        <Field helper="Today is fine." htmlFor="g-date" label="Date" required>
          <input className={fieldControlClass()} defaultValue="Today, Sep 4" id="g-date" name="date" />
        </Field>
        <Field error="That's in the future. To plan a meeting, use Schedule instead." htmlFor="g-date-err" label="Date" required>
          <input className={fieldControlClass({ error: true })} defaultValue="Sat, Sep 12" id="g-date-err" name="date_err" />
        </Field>
        <Field helper="Tap Brooke to include her — not added by default." label="Who was there" required>
          <ChipGroup label="Attendees">
            {chips.map((name) => (
              <Chip key={name} onRemove={() => setChips((current) => current.filter((item) => item !== name))} removeLabel={`Remove ${name}`} selected>
                {name}
              </Chip>
            ))}
            <Chip onSelect={() => setChips((current) => (current.includes("Brooke Fox") ? current : [...current, "Brooke Fox"]))} selected={chips.includes("Brooke Fox")}>
              Brooke
            </Chip>
            <Chip selected>Philip John Saco-Bartholomew the Third</Chip>
          </ChipGroup>
        </Field>
        <Field hint="15-minute steps" label="Duration" required>
          <Stepper format={formatDuration} label="Duration" name="duration" onChange={setDuration} step={15} value={duration} />
        </Field>
        <Field label="Where" optional>
          <input className={fieldControlClass()} id="g-where" name="where" placeholder="Bethel campus, Zoom link…" />
        </Field>
        <div>
          <ToggleRow checked={prayed} consequence="Prayed with Tanner during the meeting" label="We prayed together" name="prayed" onChange={setPrayed} />
          <ToggleRow checked={false} consequence="A request to pray for Tanner — saved to his Prayer list" label="Add something to pray for" name="pray_for" onChange={() => undefined} />
        </div>
        <HelperLine>Invites go to people with an email on file.</HelperLine>
      </div>

      <div className="mt-6">
        <StickyPrimary invalidCount={2} onInvalidClick={() => undefined}>
          Log meeting
        </StickyPrimary>
      </div>
      <div className="mt-2">
        <StickyPrimary isSaving savingLabel="Adding…" type="button">
          Add person
        </StickyPrimary>
      </div>
    </div>
  );
}
