export const supportRoutingModeValues = [
  "household",
  "general_fund",
  "state_leader",
  "regional_leader",
  "national_leadership",
  "household_nomination",
  "hidden",
] as const;

export type SupportRoutingMode = typeof supportRoutingModeValues[number];

export type SupportRoutingModeDetail = {
  adminFallback: string;
  adminRouting: string;
  adminSavedFields: string;
  publicMeaning: string;
  publicTitle: string;
};

export const supportRoutingModeDetails: Record<SupportRoutingMode, SupportRoutingModeDetail> = {
  general_fund: {
    adminFallback: "Always uses the default Church Center giving link.",
    adminRouting: "Monthly and one-time buttons route to the default Church Center giving link with the correct gift type.",
    adminSavedFields: "Saves support_mode as general_fund and clears target household routing.",
    publicMeaning: "This household is not personally raising support. Gifts support the broader USA Missionaries mission.",
    publicTitle: "USA Missionaries General Fund",
  },
  hidden: {
    adminFallback: "No public giving route is used because the support section is hidden.",
    adminRouting: "No support buttons are displayed.",
    adminSavedFields: "Saves support_mode as hidden and show_support as false.",
    publicMeaning: "The Support This Mission section is hidden from the public profile.",
    publicTitle: "Support This Mission",
  },
  household: {
    adminFallback: "Central giving routing falls back to the default Church Center giving link when no fund-specific route is configured.",
    adminRouting: "Monthly and one-time buttons resolve through the centralized USA Missionaries giving system.",
    adminSavedFields: "Saves support_mode as household plus this household's support goals.",
    publicMeaning: "This household is raising support. Gifts help sustain their ministry and the broader USA Missionaries mission.",
    publicTitle: "Support This Mission",
  },
  household_nomination: {
    adminFallback: "If the target is missing, hidden, deleted, or has no centralized giving route, giving falls back to the General Fund/default Church Center link.",
    adminRouting: "Monthly and one-time buttons resolve through the nominated household's centralized giving route when available.",
    adminSavedFields: "Saves support_mode as household_nomination and support_target_household_id.",
    publicMeaning: "This profile recommends supporting another missionary household.",
    publicTitle: "Recommended Missionary Household",
  },
  national_leadership: {
    adminFallback: "Uses the default Church Center giving link for national leadership and expansion support.",
    adminRouting: "Monthly and one-time buttons route to the default Church Center giving link with the correct gift type.",
    adminSavedFields: "Saves support_mode as national_leadership and support_target_fund as national_leadership.",
    publicMeaning: "Gifts support national leadership and expansion.",
    publicTitle: "National Leadership and Expansion",
  },
  regional_leader: {
    adminFallback: "If no regional leader target is configured, giving falls back to the General Fund/default Church Center link.",
    adminRouting: "Regional leader target routing is future-ready; current buttons use the default Church Center giving link.",
    adminSavedFields: "Saves support_mode as regional_leader and support_target_fund as regional_leader.",
    publicMeaning: "Gifts support the regional leadership connected to this household.",
    publicTitle: "Regional Leadership Support",
  },
  state_leader: {
    adminFallback: "If no state leader target is configured, giving falls back to the General Fund/default Church Center link.",
    adminRouting: "State leader target routing is future-ready; current buttons use the default Church Center giving link.",
    adminSavedFields: "Saves support_mode as state_leader and support_target_fund as state_leader.",
    publicMeaning: "Gifts support the state-level leadership connected to this household.",
    publicTitle: "State Leadership Support",
  },
};

export function normalizeSupportRoutingMode(value: string | null | undefined): SupportRoutingMode {
  if (value === "nominate_household") {
    return "household_nomination";
  }

  return supportRoutingModeValues.includes(value as SupportRoutingMode)
    ? value as SupportRoutingMode
    : "household";
}

export function getSupportRoutingPublicCopy(mode: SupportRoutingMode, targetHouseholdName?: string | null) {
  if (mode === "household_nomination" && targetHouseholdName) {
    return {
      explanation: `This profile recommends supporting ${targetHouseholdName}. Your gift helps strengthen the broader USA Missionaries work through this connected household.`,
      title: `Support ${targetHouseholdName}`,
    };
  }

  const detail = supportRoutingModeDetails[mode];

  return {
    explanation: detail.publicMeaning,
    title: detail.publicTitle,
  };
}
