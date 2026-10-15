// Pure helpers shared by the campaign engine, the server actions and the
// pages. Nothing in here touches the database.

export type CampaignKind = "nurture" | "reactivation";
export type CampaignStatus = "draft" | "active" | "paused";
export type StepChannel = "auto" | "email" | "whatsapp" | "instagram";

export type Audience = {
  stages?: string[];
  sources?: string[];
  tags?: string[];
  min_inactive_days?: number | null;
  max_inactive_days?: number | null;
};

export type StepDraft = {
  delay_hours: number;
  channel: StepChannel;
  subject: string;
  body: string;
};

export const KIND_LABEL: Record<CampaignKind, string> = {
  nurture: "Nurture",
  reactivation: "Reactivation",
};

export const KIND_BLURB: Record<CampaignKind, string> = {
  nurture:
    "Follows up new enquiries so none of them go quiet. Starts the moment a lead arrives.",
  reactivation:
    "Wins back people who went quiet -- lost leads, or enquiries that never booked.",
};

export const STEP_CHANNEL_LABEL: Record<StepChannel, string> = {
  auto: "Automatic (live chat, else email)",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

// Stages that mean "they're already in the diary" -- nobody should keep
// getting follow-ups once they've booked.
export const BOOKED_STAGES = [
  "consultation_booked",
  "consultation_attended",
  "treatment_booked",
];

// --- starter sequences -----------------------------------------------------
// Written to the follow-up rules: every message asks ONE easy question, the
// first has no link, nobody is pushed, and the second-to-last message takes
// the offer away ("closing your file") because that one gets the most replies.

export const NURTURE_STEPS: StepDraft[] = [
  {
    delay_hours: 0,
    channel: "auto",
    subject: "your enquiry with {practice}",
    body:
      "Hi {first_name}, it's {sender} at {practice}. Thanks for getting in touch - we've got your enquiry. " +
      "What's the main thing you'd like help with: a check-up, a cosmetic change, or something that's bothering you?",
  },
  {
    delay_hours: 1,
    channel: "email",
    subject: "quick one, {first_name}",
    body:
      "Hi {first_name},\n\nI sent a message a little while ago, so this may have landed at a busy moment. " +
      "Are you after a particular treatment, or not sure yet where to start? Either is completely fine - " +
      "just reply with a word or two and I'll point you the right way.\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 24,
    channel: "email",
    subject: "what a first visit involves",
    body:
      "Hi {first_name},\n\nIn case it helps, a first visit with us is a relaxed chat and a proper look - no pressure to " +
      "commit to anything, and you'll leave knowing exactly what's needed and what it costs.\n\n" +
      "Is there anything that's put you off booking so far? Cost, nerves and timing are the usual ones, " +
      "and we can help with all three.\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 24,
    channel: "email",
    subject: "re: your enquiry",
    body:
      "Hi {first_name},\n\nMost people who get in touch with us tell us afterwards they wished they'd come sooner. " +
      "Would it be easier if I suggested a couple of times for a first appointment?\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 48,
    channel: "email",
    subject: "should I close your file?",
    body:
      "Hi {first_name},\n\nI haven't heard back, so I'm guessing the timing isn't right - that's absolutely fine. " +
      "I'll close your enquiry so I'm not cluttering your inbox. " +
      "If you do still want to be seen, just reply and I'll reopen it straight away.\n\n{sender}\n{practice}",
  },
];

export const REACTIVATION_STEPS: StepDraft[] = [
  {
    delay_hours: 0,
    channel: "email",
    subject: "did you get this sorted?",
    body:
      "Hi {first_name}, it's {sender} at {practice}. You got in touch a while back about your teeth, " +
      "and I wanted to ask - did you ever get it sorted?\n\n{sender}",
  },
  {
    delay_hours: 72,
    channel: "email",
    subject: "no rush, {first_name}",
    body:
      "Hi {first_name},\n\nI'm guessing life got in the way, which happens to all of us. " +
      "If it's parked for now, that's a perfectly good answer - just let me know and I'll leave you in peace. " +
      "And if you'd still like to be seen, I can find you a time that suits.\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 48,
    channel: "email",
    subject: "what changed for others",
    body:
      "Hi {first_name},\n\nA lot of the people who come back to us after a gap say the same thing: " +
      "they'd been putting it off because they weren't sure what it would involve or cost. " +
      "Would a no-obligation chat to get a clear picture be useful?\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 72,
    channel: "email",
    subject: "taking you off the list",
    body:
      "Hi {first_name},\n\nI don't want to keep filling your inbox, so unless I hear from you I'll take you off " +
      "our follow-up list. No explanation needed either way.\n\n{sender}\n{practice}",
  },
  {
    delay_hours: 24,
    channel: "email",
    subject: "closing your file",
    body:
      "Hi {first_name},\n\nI'm closing your file today, so this is my last message. " +
      "If you ever want to pick it up again, just reply to this and I'll reopen it.\n\n" +
      "Wishing you well,\n{sender}\n{practice}",
  },
];

export function starterSteps(kind: CampaignKind): StepDraft[] {
  return kind === "nurture" ? NURTURE_STEPS : REACTIVATION_STEPS;
}

export function starterAudience(kind: CampaignKind): Audience {
  return kind === "nurture"
    ? { stages: ["new_lead"] }
    : { stages: ["closed_lost", "contacted"], min_inactive_days: 30 };
}

// --- message rendering -------------------------------------------------------

export const PLACEHOLDERS = ["{first_name}", "{practice}", "{sender}"] as const;

export function renderTemplate(
  template: string,
  vars: { first_name: string; practice: string; sender: string },
): string {
  return template
    .replace(/\{first_name\}/g, vars.first_name.trim() || "there")
    .replace(/\{practice\}/g, vars.practice.trim() || "our practice")
    .replace(/\{sender\}/g, vars.sender.trim() || "The team");
}

// Every marketing message carries a working way out. STOP is understood on
// WhatsApp and Instagram automatically; for email, replies land in the
// mailbox, so staff flip the patient's opt-out switch when one arrives.
export function withOptOut(body: string, channel: "email" | "whatsapp" | "instagram"): string {
  return channel === "email"
    ? `${body}\n\n--\nIf you'd rather not hear from us, just reply STOP and we'll take you off the list.`
    : `${body}\n\nReply STOP to opt out.`;
}

const STOP_WORDS = /^\s*(stop|unsubscribe|opt[\s-]?out|remove me|cancel)\W*$/i;

export function isStopMessage(text: string): boolean {
  return STOP_WORDS.test(text);
}

// --- send window (UK clinic hours) -------------------------------------------

const LONDON = "Europe/London";
const WINDOW_START_HOUR = 9;
const WINDOW_END_HOUR = 18;

function londonParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hourCycle: "h23",
    hour: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hour: Number(get("hour")),
    weekday: get("weekday"),
    day: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

// 09:00-18:00 UK time, Monday to Saturday. Never early mornings, evenings
// or Sundays.
export function inSendWindow(date: Date = new Date()): boolean {
  const { hour, weekday } = londonParts(date);
  return weekday !== "Sun" && hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

export function londonDay(date: Date): string {
  return londonParts(date).day;
}

export const SEND_WINDOW_LABEL = "09:00-18:00 UK time, Monday to Saturday";

export function describeDelay(hours: number): string {
  if (hours === 0) return "straight away";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} later`;
  const days = hours / 24;
  return Number.isInteger(days)
    ? `${days} day${days === 1 ? "" : "s"} later`
    : `${hours} hours later`;
}
