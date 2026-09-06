# Phase 2 — Shared components and design-pattern inconsistencies (USA-209)

## 1. Screen → pattern map

| Screen | Layout / nav | Fields & forms | Cards / rows | Pills / tabs | Sheets | Typography | Color | Icons | Responsive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home (M) | Hero header "DOS / Discipleship on the go.", circle target, stacked cards, bottom nav | — | Rounded white cards (`rounded-[24px]`+) with eyebrows (Notifications, Today's Alignment) | none | Upcoming / Activity / Scheduling Links | Display 32px title; 10px tracked eyebrows | Blue gradient wash background (`#EAF2FF`→white→peach), `#2563EB` primary | inline `Icon` | Desktop swaps to Dashboard |
| Dashboard (D) | Sidebar + 2-column `DesktopPanel` grid | — | `DesktopPanel` cards with eyebrow + title; table rows (Top Time Investments) | none | — | 32px page title, 10px eyebrows | white panels on `#F8FBFF` | inline `Icon` | `md:` only |
| Meetings (M) | `TabHero` title + Settings/View control, search, sections | date via calendar popover | Needs Logging card, month grid cells, Recently Logged rows | month/week segmented "View" | Google event, meeting detail, options, notes, send | 32px title; 10–11px labels; 9px weekday letters | blue dots, green dots, `#EBF2FF` selected | inline `Icon` | Calendar reflows; desktop adds side panels |
| Log / Edit Meeting | `DosWorkflowPage` full screen, back arrow, 32px title + lead, sticky footer | `DosFormSection` (icon tile + title) ×N, `DosFormField`, `DosDateInput`, `FormOptionSelect`, `CompactOptionSelect`, duration pills, `VoiceTextarea`, disclosure "More people" | — | duration pills 15m/30m/45m/1h/Custom | Discard dialog | 13px labels `#475569`, 10px helper | outline pills `#2563EB` selected | inline `Icon` | max-w 620, `md:left-[232px]` |
| Schedule Meeting | same frame | own date/time/duration controls (not shared with Log) | — | — | — | same | same | | same |
| Field (M) | `TabHero` + Settings, search, `PeopleCircleTabs` | — | `CircleLayerList` rows: initials avatar, name, relationship label, chevron | All/3/12/70/120 segmented | Circle layer sheet, import | 32px title, 15px names, 10px pills | `#EBF2FF` avatar tint | inline `Icon` | Desktop `DesktopPeopleIndex` table (7 or 6 columns) |
| Person Record | Overlay: back + Edit, centred avatar/name/relationship, pill rail, sections | + Add per section | Last Meeting / Next Meeting cards, hairline rows, progress bar | Overview/Timeline/Details filled-pill rail | 12+ sheets | 32px name, 10px eyebrows, 15px rows | `#2563EB` Continue button, `#EBF2FF` tint | inline `Icon` | Desktop shows same overlay inside content area |
| More / Apps (M) | Title-less grid, FAB | search | Two-column tiles: icon circle, count/status pill, name, description | status pills | — | 24px tile title, 13px description, 10px pill | `#EBF2FF` icon tiles | inline `Icon` | Desktop `DesktopMoreLauncher` cards |
| My Record | `TabHero` + Share, "← More" back pill, `MyRecordTabBar` | 10 forms in `MyRecordSheetFrame` | glance tiles, `MyRecordActivityRow`, `MyRecordCompactRecordCard` | Overview/Walk/Growth/Purpose/Faithfulness (rounded white rail with shadow, not filled-blue) | timeline, forms, detail panels | 32px title, 12px tracked eyebrows, 14–15px rows | green/blue/amber tile tints | inline `Icon` + emoji glyphs | Desktop wider columns |
| Prayer | `TabHero` + Settings + "← More", search, tabs | Add/Edit request, partner, log prayer sheets | request rows with heart tile | prayers / prayer team / answered; praying / answered; 6 filters | 8 sheets | | | inline `Icon`, `Heart` | `MobilePrayerWorkspace` vs `DesktopPrayerWorkspace` (two implementations) |
| Groups | list + detail with 9-tab bar | 7 sheets | group cards, member rows, gathering rows, attendance chips | list all/mine; detail 9 tabs | 7 | | | inline `Icon` | shared |
| Fruit | `TabHero`, `SegmentedTabs` | Record Fruit sheet | story cards, breakdown, forms grid, reviews list, desktop table | activity/forms/impact/reviews | 4 | | green accents (`#15803D`, `#BBF7D0`) | inline `Icon` | `DesktopFruitStoriesTable` |
| Library | `TabHero` + "← More", sections, resource shell | assignment sheets | `LibrarySection`, `CatalogResourceList`, `LibraryCollectionRow` | none | picker, detail, assign | | gold eyebrow on reading plan (V10 flags) | `BookOpen`, `Film`, `Heart` | shared |
| Settings | profile view + Advanced Features panel | `EditProfileSheet`, availability/invitation editors | rows | none | 4 | | | | shared |
| Placeholders (Reports, Stewardship, Testimony Practice, Table Flow) | `TabPageHeader` + `TabHero` + copy | — | one card | — | — | | | lucide `Megaphone`, `Briefcase`, `Mic`, `Gift`… | shared |

## 2. Component families that exist today (all file-local to `DosMvpAppClient.tsx` unless noted)

| Family | Members | Instances | Notes |
| --- | --- | --- | --- |
| Page headers | `TabHero`, `TabPageHeader`, `MoreBackButton`, `LibraryResourceBackButton`, `SectionHeading` | `TabHero` ×12 views | Three header grammars: hero (Home), title + control (Meetings/Field), "← More" pill + title (My Record/Prayer/Library) |
| Forms | `DosFormSection`, `DosFormField`, `DosDateInput`, `FormOptionSelect`, `CompactOptionSelect`, `FieldLabel`, `FieldInputClass`, `VoiceTextarea` (shared file), `DisclosureSection` | `DosFormSection` ×60 | Used by meeting forms; My Record, prayer, group forms mostly bypass them |
| Buttons | `AppButton` (tones black / soft / white), `CompactButton`, `MyRecordActionButton` | `AppButton` ×109 | "black" tone renders blue; naming is stale |
| Tabs | `SegmentedTabs` + 8 `SegmentedTabOption` arrays; `MyRecordTabBar`; `PeopleCircleTabs`; `GroupDetailTabBar` | 4 tab components | Three visual treatments: filled-blue pill rail (Person), white rail with shadow (My Record), segmented control (Fruit) |
| Overlays | `Sheet`, `MobileBottomSheet`, `ProfileSheetFrame`, `DosWorkflowPage`, `DiscardChangesDialog`, `PersonDetailOverlay`, `MeetingDetailOverlay`, `CirclesDetailOverlay` | 60 + 2 + 1 + 4 | Three sheet frames, three overlay styles |
| Rows & cards | `PersonRecordRow`, `HomeActivitySheetRow`, `UpcomingTimelineRow`, `MyRecordActivityRow`, `MyRecordCompactRecordCard`, `MyRecordPreviewCard`, `LibraryCollectionRow`, `OrganizationConnectionRow`, `DesktopPanel`, `DetailCard`, `AppsCatalogSection` | `DesktopPanel` ×40 | Each family defines its own padding, radius, hairline |
| States | `EmptyState`, `SectionEmptyState`, `MyRecordCompactEmptyRow`, `DosMobileMessageScreen` (own file), `DosTargetLoader` (`components/dos/`) | | Three empty-state components |
| Icons | inline `Icon` (18 names, 1423) **plus** lucide imports (`Heart`, `BookOpen`, `Film`, `Mic`, `Users`, `User`, `Settings`, `Search`, `Briefcase`, `Megaphone`, `Gift`, `GitBranch`, `HeartHandshake`) | | **Two icon systems in one file**; the nav uses the inline set (protected) |
| Circle target | `DosCircleTarget` (`components/dos/`), `CircleFocusHero`, `CircleLayerList`, `CircleLayerSheet` | | Home target is protected |
| Pills / status | ad-hoc `rounded-full` spans with per-site colors; `MyRecordAssessmentStatusPill`; `FruitFormStatus` | | No shared status vocabulary (V10: amber overdue / due soon, grey otherwise, blue scheduled) |

## 3. Inconsistencies (evidence-backed)

| # | Inconsistency | Evidence | Migration candidate |
| --- | --- | --- | --- |
| I1 | Two text ladders, two blues | Phase 1 §4 (`#0F172A`×459 vs token `#0F1520`; `#2563EB`/`#1D4ED8` vs `#2450C8`); V10 uses `#0B1220` / `#5A6473` / blue `#2251E8` | One token set (USA-208) |
| I2 | Light gray readable text | `text-[#94A3B8]` ×133 | Secondary token (USA-208) |
| I3 | 15 arbitrary font sizes incl. 8/9/10 px | Phase 1 §4 | Type scale (USA-208): V10 uses 13.5 / 15 / 17 / 20 / 24 / 26 |
| I4 | Three sheet frames + separate overlay styles | §2 | One `Sheet` with `kind` + one bottom-sheet variant (USA-211) |
| I5 | Three tab treatments | §2 | One pill rail (V10 treatment A: 36px pills, 13.5/600, active filled blue) (USA-213) |
| I6 | Three header grammars ("← More" pill vs standard back) | Prayer/My Record/Library use "← More"; V10 standardizes back + title + optional control | Header primitive (USA-213) |
| I7 | Two icon systems | inline `Icon` + 13 lucide icons | Keep inline for nav; decide one for the rest (USA-213) — nav icons untouched |
| I8 | Field labels in tracked caps on My Record / Prayer / Library forms vs sentence-case 13px labels on meeting forms | V10 §"drift" | Form primitives (USA-211) |
| I9 | Status as colored text ("Follow-up overdue" blue link) vs pills | Prayer rows | Status pill vocabulary (USA-213) |
| I10 | Nested containers (card in card) on assessment header, Prayers list, Timer box | V10 §"drift" | Eyebrow + hairline pattern (USA-213) |
| I11 | Sticky action stacked on nav (reading plan step: Complete + Save later + nav ≈ 190 px chrome) | V10 §"drift" | Task-screen rule: never both (USA-214) |
| I12 | Info boxes explaining controls | Library assign, prayer visibility | One helper line (USA-211) |
| I13 | Translucent nav and footers | Phase 0 | Opaque surfaces + 134 px clearance (USA-214) |
| I14 | Duplicate desktop/mobile implementations of the same workspace (`MobilePrayerWorkspace` vs `DesktopPrayerWorkspace`; `DesktopHomeDashboard` vs mobile Home) | function list | Out of scope for restyle; note for Phase 6 |
| I15 | Mixed radii (`rounded-2xl`, `rounded-[22px]`, `rounded-[24px]`, `rounded-[30px]`, `rounded-full`) and shadows (`shadow-[0_22px_60px_rgba(37,99,235,0.18)]`, `shadow-[0_24px_55px_rgba(148,163,184,0.22)]`, inset highlights) | grep | Radius/elevation tokens: V10 `--r1 12px --r2 20px --r3 999px`, `--float` (USA-208) |
| I16 | Gradient page background on mobile (blue→peach wash) vs V10 plain white / `#F7F8FB` surface | screenshots | Surface tokens (USA-208); **Home keeps its background** |
| I17 | `AppButton tone="black"` renders blue | 1099 | Rename in USA-213 (internal) |
| I18 | Two shared-component roots (`components/dos/`, `src/components/dos/`) | Phase 1 | Consolidate (USA-213) |

## 4. Duplication candidates for the Phase 4 foundation (extraction order)

1. **Tokens** (`src/lib/dos/text-tokens.ts` + `tailwind.config.js`): ladder, blue, surfaces, hairline, radius, elevation, type scale, spacing — no component change (USA-208).
2. **`Sheet` / `BottomSheet` / `WorkflowPage` / `DiscardChangesDialog`** into `src/components/dos/overlays/`, keeping `useUnsavedWorkGuard` semantics byte-for-byte (USA-211).
3. **Form primitives** (`DosFormSection`, `DosFormField`, `DosDateInput`, selects, stepper, chip group, toggle row, helper/error line, sticky primary) into `src/components/dos/forms/` (USA-211).
4. **Controls** (`AppButton`, `CompactButton`, pill rail, segmented tabs, status pill, page header, row, card, empty state) into `src/components/dos/ui/` (USA-213).
5. **Navigation** (`MobileTabBar`, FAB, scroll-container clearance) — opacity, safe area, z-index ladder; icons and labels untouched (USA-214).

Each extraction is a pure move first (re-export from the original location), then adoption per screen in Phases 5–6.
