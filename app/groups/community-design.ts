/**
 * Shared presentation tokens for the DOS Community surfaces.
 *
 * USA-57. Every public, member and leader Community surface reads from this
 * one file so the three views stay one product instead of drifting into
 * separate visual systems again.
 *
 * The values are the established DOS app tokens, not new colors:
 *   ink #0F172A · secondary #475569 · muted #64748B · faint #94A3B8
 *   DOS blue #2563EB → #1D4ED8 · tint #EBF2FF · borders #DCEBFF / #EAF2FF / #BFDBFE
 *   page #F8FBFF · hairline #E2E8F0
 *
 * Organization identity is restrained co-branding only — a small logo, a
 * short label, and at most an accent. It never replaces these tokens.
 */

/** Page background: the DOS dawn shell. */
// The global body is dark, so an explicit solid base sits under the gradient.
// Without it, any surface taller than the gradient lets the dark body show
// through — which is exactly how the old dark treatment crept back in.
export const communityPage =
  "min-h-screen [background-color:#F8FBFF] bg-[radial-gradient(circle_at_78%_8%,rgba(219,234,254,0.92),transparent_34%),radial-gradient(circle_at_86%_92%,rgba(254,215,170,0.54),transparent_36%),radial-gradient(circle_at_48%_62%,rgba(221,214,254,0.48),transparent_42%),linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_48%,#FFF4EC_100%)] text-[#0F172A]";

/** The standard DOS card. */
export const communityCard =
  "rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]";

/** A card that is also a link/button target. */
export const communityCardInteractive = `${communityCard} transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]`;

/** Primary action — DOS blue gradient pill. */
export const communityPrimaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-colors hover:brightness-[0.98]";

/** Secondary action — outline pill. */
export const communitySecondaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#2563EB] hover:bg-[#EBF2FF]";

/** Small type-label chip. */
export const communityChip =
  "inline-flex items-center rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]";

/** Neutral metadata chip. */
export const communityChipMuted =
  "inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#475569]";

/** Section eyebrow. */
export const communityEyebrow =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]";

/** Field label. */
export const communityFieldLabel =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]";

/** Text input / textarea. */
export const communityInput =
  "min-h-11 w-full rounded-2xl border border-[#DCEBFF] bg-white px-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";

/**
 * Restrained organization co-branding row: small logo + "A {org} Group".
 * Independent DOS Groups pass no organization and simply render nothing.
 */
export const communityOrgLabel =
  "inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#475569]";

/* ------------------------------------------------------------------ *
 * USA Missionaries public brand.
 *
 * USA-57 founder correction: the boundary is by surface, not a global ban
 * on gold. Authenticated DOS leader/member/installable surfaces use the DOS
 * tokens above. The USA Missionaries public directory and Group detail pages
 * may carry the USA Missionaries brand, including restrained gold.
 *
 * Restrained means accents, eyebrows and the primary action — not a dark
 * brutalist theme. `#C2A14E` is the brand gold; `#A47F2A` is its darker
 * companion used for text, because the brand gold alone does not clear
 * contrast on white.
 * ------------------------------------------------------------------ */

/** Public page background — warm, light, premium. Not the DOS dawn shell. */
export const usamPublicPage =
  "min-h-screen [background-color:#FBF9F4] bg-[linear-gradient(180deg,#FDFBF7_0%,#FBF9F4_38%,#F7F4EC_100%)] text-[#0F172A]";

/** Public card — same geometry as DOS, warm hairline. */
export const usamPublicCard =
  "rounded-[24px] border border-[#EFE6D0] bg-white shadow-[0_14px_34px_rgba(120,94,38,0.06)]";

export const usamPublicCardInteractive = `${usamPublicCard} transition-colors hover:border-[#DCC79A] hover:bg-[#FDFBF7]`;

/** Public primary action — brand gold. */
export const usamPublicPrimaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#C2A14E] px-5 text-sm font-bold text-[#241B07] shadow-[0_12px_28px_rgba(194,161,78,0.28)] transition-colors hover:bg-[#D4B665]";

export const usamPublicSecondaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#DCC79A] bg-white px-5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#C2A14E] hover:bg-[#FDFBF7]";

/** Public eyebrow — darker gold so it clears contrast on white. */
export const usamPublicEyebrow =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-[#A47F2A]";

/** Public type chip. */
export const usamPublicChip =
  "inline-flex items-center rounded-full bg-[#F7F0E0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#A47F2A]";

/** Neutral metadata chip on public surfaces. */
export const usamPublicChipMuted =
  "inline-flex items-center rounded-full bg-[#F4F2EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B5344]";

/** Public field label. */
export const usamPublicFieldLabel =
  "text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A6B4E]";

/** Public input. */
export const usamPublicInput =
  "min-h-11 w-full rounded-2xl border border-[#E5D9BE] bg-white px-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#A79C86] focus:border-[#C2A14E]";
