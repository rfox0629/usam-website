/* DOS shared UI controls (canonical spec §3). Screens adopt these one at a time
 * in Phases 5–6; the legacy controls in ./legacy-controls.tsx render exactly
 * what production renders today until then. */
export { Button, type ButtonVariant } from "./Button";
export { Eyebrow, PageHeader } from "./PageHeader";
export { PillRail, Segmented, type PillRailOption } from "./PillRail";
export { Avatar, IconTile, StatusPill, type StatusTone } from "./Pills";
export { Card, Row } from "./Row";
export { EmptyState, SearchField } from "./States";
