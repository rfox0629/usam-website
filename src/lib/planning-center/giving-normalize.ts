// Pure Planning Center Giving transforms. This module deliberately has no
// imports: no server-only, no Supabase, no path aliases. That keeps the
// normalize/attribute logic directly executable by the regression script.

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function centsToAmount(value: unknown) {
  const cents = typeof value === "number" ? value : Number(value);

  return Number.isFinite(cents) ? Math.round(cents) / 100 : null;
}

export function relationshipId(relationships: JsonRecord, key: string) {
  return cleanText(asRecord(asRecord(asRecord(relationships)[key]).data).id);
}

export type DesignationMappingRow = {
  campaign_name: string | null;
  designation_name: string | null;
  fund_name: string | null;
  missionary_profile_id: string | null;
  pco_campaign_id: string | null;
  pco_fund_id: string | null;
  target_kind: string;
};

type Attribution = {
  kind: "general" | "missionary" | "unmapped" | "ignored";
  missionaryProfileId: string | null;
  source: string | null;
};

const UNMAPPED: Attribution = { kind: "unmapped", missionaryProfileId: null, source: null };

/**
 * Attribution is table-driven on purpose. A gift only reaches a missionary when
 * an explicit mapping row names that missionary; there is no name similarity,
 * no scoring, and no fallback guess.
 */
export function resolveAttribution({
  campaignId,
  designationCount,
  designationName,
  fundId,
  mappings,
}: {
  campaignId: string | null;
  designationCount: number;
  designationName: string | null;
  fundId: string | null;
  mappings: DesignationMappingRow[];
}): Attribution {
  if (designationCount > 1) {
    // A split gift cannot be attributed to one missionary without inventing a
    // division of the money, so it waits for a human.
    return { ...UNMAPPED, source: "multi_designation" };
  }

  const byFund = fundId ? mappings.find((row) => row.pco_fund_id === fundId) : undefined;
  const byCampaign = campaignId
    ? mappings.find((row) => !row.pco_fund_id && row.pco_campaign_id === campaignId)
    : undefined;
  const byDesignation = designationName
    ? mappings.find((row) => (
      !row.pco_fund_id
      && !row.pco_campaign_id
      && row.designation_name
      && row.designation_name.toLowerCase() === designationName.toLowerCase()
    ))
    : undefined;

  const match = byFund ?? byCampaign ?? byDesignation;

  if (!match) {
    return UNMAPPED;
  }

  const source = match === byFund ? "fund_mapping" : match === byCampaign ? "campaign_mapping" : "designation_mapping";

  if (match.target_kind === "missionary" && match.missionary_profile_id) {
    return { kind: "missionary", missionaryProfileId: match.missionary_profile_id, source };
  }

  if (match.target_kind === "general") {
    return { kind: "general", missionaryProfileId: null, source };
  }

  if (match.target_kind === "ignored") {
    return { kind: "ignored", missionaryProfileId: null, source };
  }

  return UNMAPPED;
}

export type NormalizedGift = {
  attribution_kind: string;
  attributed_missionary_profile_id: string | null;
  attribution_source: string | null;
  campaign_name: string | null;
  currency: string | null;
  designation_count: number;
  designation_name: string | null;
  donation_date: string | null;
  donor_display_name: string | null;
  donor_email: string | null;
  donor_first_name: string | null;
  donor_last_name: string | null;
  fee_amount: number | null;
  fund_name: string | null;
  gift_status: string | null;
  gift_type: string;
  gross_amount: number | null;
  is_recurring: boolean;
  net_amount: number | null;
  payment_method: string | null;
  payment_source: string | null;
  pco_batch_id: string | null;
  pco_campaign_id: string | null;
  pco_donation_id: string;
  pco_fund_id: string | null;
  pco_payment_source_id: string | null;
  pco_person_id: string | null;
  pco_recurring_source_id: string | null;
  pco_refund_id: string | null;
  pco_updated_at: string | null;
  raw_payload: JsonRecord;
  received_at: string | null;
  refunded: boolean;
  refunded_at: string | null;
};

export function normalizeDonation({
  donation,
  fundNames,
  included,
  mappings,
}: {
  donation: JsonRecord;
  fundNames: Map<string, string>;
  included: Map<string, JsonRecord>;
  mappings: DesignationMappingRow[];
}): NormalizedGift | null {
  const donationId = cleanText(donation.id);

  if (!donationId) {
    return null;
  }

  const attributes = asRecord(donation.attributes);
  const relationships = asRecord(donation.relationships);
  const personId = relationshipId(relationships, "person");
  const person = personId ? asRecord(included.get(`Person:${personId}`)) : {};
  const personAttributes = asRecord(person.attributes);

  const designationIds = asArray(asRecord(relationships.designations).data)
    .map((entry) => cleanText(asRecord(entry).id))
    .filter((value): value is string => Boolean(value));
  const designations = designationIds
    .map((id) => asRecord(included.get(`Designation:${id}`)))
    .filter((entry) => Object.keys(entry).length > 0);
  const primaryDesignation = designations[0] ? asRecord(designations[0]) : {};
  const fundId = relationshipId(asRecord(primaryDesignation.relationships), "fund");
  const campaignId = relationshipId(asRecord(primaryDesignation.relationships), "campaign")
    ?? relationshipId(relationships, "campaign");
  const fundName = fundId ? fundNames.get(fundId) ?? null : null;
  const campaign = campaignId ? asRecord(included.get(`Campaign:${campaignId}`)) : {};
  const campaignName = cleanText(asRecord(campaign.attributes).name);
  const recurringId = relationshipId(relationships, "recurring_donation");
  const refundId = relationshipId(relationships, "refund");
  const refunded = attributes.refunded === true || Boolean(refundId);
  const paymentSourceId = relationshipId(relationships, "payment_source");
  const paymentSource = paymentSourceId ? asRecord(included.get(`PaymentSource:${paymentSourceId}`)) : {};

  const attribution = resolveAttribution({
    campaignId,
    designationCount: designations.length,
    designationName: fundName,
    fundId,
    mappings,
  });

  const donorFirst = cleanText(personAttributes.first_name);
  const donorLast = cleanText(personAttributes.last_name);
  const gross = centsToAmount(attributes.amount_cents);
  const fee = centsToAmount(attributes.fee_cents);

  return {
    attributed_missionary_profile_id: attribution.missionaryProfileId,
    attribution_kind: attribution.kind,
    attribution_source: attribution.source,
    campaign_name: campaignName,
    currency: cleanText(attributes.amount_currency),
    designation_count: designations.length,
    designation_name: fundName,
    donation_date: cleanText(attributes.completed_at) ?? cleanText(attributes.received_at) ?? cleanText(attributes.created_at),
    donor_display_name: [donorFirst, donorLast].filter(Boolean).join(" ").trim() || null,
    donor_email: null,
    donor_first_name: donorFirst,
    donor_last_name: donorLast,
    fee_amount: fee,
    fund_name: fundName,
    gift_status: cleanText(attributes.payment_status),
    gift_type: recurringId ? "monthly" : "one_time",
    gross_amount: gross,
    is_recurring: Boolean(recurringId),
    net_amount: gross !== null && fee !== null ? Math.round((gross + fee) * 100) / 100 : gross,
    payment_method: cleanText(attributes.payment_method),
    payment_source: cleanText(asRecord(paymentSource.attributes).name) ?? cleanText(attributes.payment_method_sub),
    pco_batch_id: relationshipId(relationships, "batch"),
    pco_campaign_id: campaignId,
    pco_donation_id: donationId,
    pco_fund_id: fundId,
    pco_payment_source_id: paymentSourceId,
    pco_person_id: personId,
    // Deliberately not pco_recurring_donation_id: that column carries a unique
    // index and many donations share one recurring schedule.
    pco_recurring_source_id: recurringId,
    pco_refund_id: refundId,
    pco_updated_at: cleanText(attributes.updated_at),
    raw_payload: { attributes, designations, relationships },
    received_at: cleanText(attributes.received_at),
    refunded,
    refunded_at: refunded ? cleanText(attributes.updated_at) : null,
  };
}
