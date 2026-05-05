"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

function getString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getOptionalString(formData: FormData, name: string) {
  const value = getString(formData, name);

  return value ? value : null;
}

function getBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function getAvailability(formData: FormData) {
  return formData
    .getAll("availability")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function submitPrayerPartnerApplication(formData: FormData) {
  const firstName = getString(formData, "first_name");
  const lastName = getString(formData, "last_name");
  const email = getString(formData, "email").toLowerCase();
  const confidentialityAgreement = getBoolean(formData, "confidentiality_agreement");
  const availability = getAvailability(formData);

  if (!firstName || !lastName || !email) {
    redirect("/prayer/apply?error=missing");
  }

  if (!confidentialityAgreement) {
    redirect("/prayer/apply?error=confidentiality");
  }

  if (!isSupabaseServerConfigured()) {
    redirect("/prayer/apply?error=config");
  }

  const supabase = await createSupabaseServerClient();

  // Placeholder integration seam: this insert maps directly to
  // public.prayer_partner_applications and can be extended with workflow
  // notifications once Supabase Edge Functions or an email provider are added.
  const { error } = await supabase
    .from("prayer_partner_applications")
    .insert({
      availability,
      church_affiliation: getOptionalString(formData, "church_affiliation"),
      city: getOptionalString(formData, "city"),
      confidentiality_agreement: confidentialityAgreement,
      email,
      email_alerts: getBoolean(formData, "email_alerts"),
      first_name: firstName,
      last_name: lastName,
      motivation: getOptionalString(formData, "motivation"),
      phone: getOptionalString(formData, "phone"),
      referral_source: getOptionalString(formData, "referral_source"),
      sms_alerts: getBoolean(formData, "sms_alerts"),
      state: getOptionalString(formData, "state"),
      status: "pending",
    });

  if (error) {
    redirect("/prayer/apply?error=submit");
  }

  redirect("/prayer/apply?submitted=1");
}
