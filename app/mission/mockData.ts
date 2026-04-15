export const briefingMetrics = [
  { label: "Active Cities", value: "27", note: "4 in launch rhythm" },
  { label: "Live Tables", value: "118", note: "14 ready to multiply" },
  { label: "Active Operators", value: "43", note: "9 in training" },
  { label: "New This Month", value: "16", note: "tables + operators added" },
] as const;

export const commandsMetrics = [
  { label: "Total in Commands Track", value: "186", note: "across all active pathways" },
  { label: "Active Now", value: "94", note: "currently progressing" },
  { label: "Completed", value: "61", note: "finished current command" },
  { label: "New This Month", value: "31", note: "entered the track in April" },
] as const;

export const commandsRows = [
  {
    name: "Jordan M.",
    currentCommand: "Repent and Believe",
    status: "Active",
    lastActivity: "2 days ago",
    nextStep: "Follow-up conversation",
  },
  {
    name: "Elena R.",
    currentCommand: "Be Baptized",
    status: "Active",
    lastActivity: "Today",
    nextStep: "Schedule baptism date",
  },
  {
    name: "Marcus T.",
    currentCommand: "Pray",
    status: "Completed",
    lastActivity: "4 days ago",
    nextStep: "Advance to give",
  },
  {
    name: "Avery S.",
    currentCommand: "Give",
    status: "New",
    lastActivity: "Yesterday",
    nextStep: "First generosity action",
  },
  {
    name: "Naomi K.",
    currentCommand: "Go and Make Disciples",
    status: "Active",
    lastActivity: "Today",
    nextStep: "Start first table",
  },
  {
    name: "Daniel P.",
    currentCommand: "Love Your Neighbor",
    status: "Completed",
    lastActivity: "3 days ago",
    nextStep: "Move into serve rhythm",
  },
] as const;

export const prayerTeamMetrics = [
  { label: "Total Prayer Members", value: "312", note: "covering the mission weekly" },
  { label: "New This Month", value: "28", note: "joined prayer coverage in April" },
  { label: "States Represented", value: "19", note: "growing national prayer reach" },
] as const;
