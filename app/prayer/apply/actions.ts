"use server";

import { redirect } from "next/navigation";
import { createFormSubmission } from "@/src/lib/forms/form-submissions";

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
    redirect("/prayer/join?error=missing");
  }

  if (!confidentialityAgreement) {
    redirect("/prayer/join?error=confidentiality");
  }

  const phone = getOptionalString(formData, "phone");
  const city = getOptionalString(formData, "city");
  const state = getOptionalString(formData, "state");
  const churchAffiliation = getOptionalString(formData, "church_affiliation");
  const referralSource = getOptionalString(formData, "referral_source");
  const motivation = getOptionalString(formData, "motivation");
  const emailAlerts = getBoolean(formData, "email_alerts");
  const smsAlerts = getBoolean(formData, "sms_alerts");

  const { error } = await createFormSubmission({
    assignedTeam: "prayer_team",
    email,
    firstName,
    formType: "prayer_team_application",
    lastName,
    message: motivation,
    payload: {
      availability,
      church_affiliation: churchAffiliation,
      city,
      confidentiality_agreement: confidentialityAgreement,
      email_alerts: emailAlerts,
      motivation,
      referral_source: referralSource,
      sms_alerts: smsAlerts,
      state,
    },
    phone,
    sourcePage: "/prayer/join",
  });

  if (error) {
    redirect("/prayer/join?error=submit");
  }

  redirect("/prayer/join?submitted=1");
}
