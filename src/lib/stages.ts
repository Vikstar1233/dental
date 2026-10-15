export const STAGES = [
  "new_lead",
  "contacted",
  "consultation_booked",
  "consultation_attended",
  "treatment_booked",
  "closed_lost",
] as const;

export const STAGE_LABEL: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  consultation_booked: "Consultation Booked",
  consultation_attended: "Consultation Attended",
  treatment_booked: "Treatment Booked",
  closed_lost: "Closed Lost",
};

export const SOURCES = [
  "manual",
  "walk_in",
  "referral",
  "meta",
  "instagram",
  "google",
  "other",
] as const;

export const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  walk_in: "Walk-in",
  referral: "Referral",
  meta: "Meta lead form",
  instagram: "Instagram",
  google: "Google",
  other: "Other",
};

export const CHANNELS = ["whatsapp", "sms", "instagram", "email"] as const;

export const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  instagram: "Instagram",
  email: "Email",
};
