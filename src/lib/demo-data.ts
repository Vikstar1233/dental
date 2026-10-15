// Sample data for the public /demo walkthrough. Entirely made up and never
// read from or written to the database -- the demo works with no login and
// shows nothing real. Phone numbers are the ranges reserved for fiction.

export type DemoPatient = {
  id: string;
  first: string;
  last: string;
  phone: string;
  email: string;
  source: string;
  stage: string;
  doctor: string | null; // doctor id
  tags: string[];
  channel: string;
  lastActivity: string;
};

export const DEMO_DOCTORS = [
  { id: "d1", name: "Dr Amelia Clarke" },
  { id: "d2", name: "Dr James Whitfield" },
];

// The doctor the "see it as a doctor" view is signed in as.
export const DEMO_DOCTOR_ID = "d1";

export const DEMO_PATIENTS: DemoPatient[] = [
  { id: "p1", first: "Priya", last: "Nair", phone: "07700 900141", email: "priya.nair@example.com", source: "meta", stage: "new_lead", doctor: null, tags: ["invisalign interest"], channel: "whatsapp", lastActivity: "12 min ago" },
  { id: "p2", first: "Liam", last: "Walsh", phone: "07700 900142", email: "liam.walsh@example.com", source: "instagram", stage: "new_lead", doctor: null, tags: [], channel: "instagram", lastActivity: "1 hour ago" },
  { id: "p3", first: "Zara", last: "Hussain", phone: "07700 900143", email: "zara.h@example.com", source: "meta", stage: "contacted", doctor: "d1", tags: ["whitening"], channel: "whatsapp", lastActivity: "3 hours ago" },
  { id: "p4", first: "George", last: "Bennett", phone: "07700 900144", email: "george.bennett@example.com", source: "referral", stage: "contacted", doctor: "d2", tags: [], channel: "email", lastActivity: "Yesterday" },
  { id: "p5", first: "Olivia", last: "Brooks", phone: "07700 900145", email: "olivia.brooks@example.com", source: "meta", stage: "consultation_booked", doctor: "d1", tags: ["nervous patient"], channel: "whatsapp", lastActivity: "Yesterday" },
  { id: "p6", first: "Henry", last: "Adams", phone: "07700 900146", email: "henry.adams@example.com", source: "google", stage: "consultation_booked", doctor: "d2", tags: [], channel: "email", lastActivity: "2 days ago" },
  { id: "p7", first: "Sofia", last: "Rossi", phone: "07700 900147", email: "sofia.rossi@example.com", source: "instagram", stage: "consultation_attended", doctor: "d1", tags: ["implants"], channel: "instagram", lastActivity: "2 days ago" },
  { id: "p8", first: "Daniel", last: "Okafor", phone: "07700 900148", email: "daniel.okafor@example.com", source: "walk_in", stage: "consultation_attended", doctor: "d2", tags: [], channel: "email", lastActivity: "3 days ago" },
  { id: "p9", first: "Emily", last: "Carter", phone: "07700 900149", email: "emily.carter@example.com", source: "meta", stage: "treatment_booked", doctor: "d1", tags: ["invisalign"], channel: "whatsapp", lastActivity: "4 days ago" },
  { id: "p10", first: "Mohammed", last: "Khan", phone: "07700 900150", email: "m.khan@example.com", source: "referral", stage: "treatment_booked", doctor: "d2", tags: [], channel: "email", lastActivity: "5 days ago" },
  { id: "p11", first: "Charlotte", last: "Hayes", phone: "07700 900151", email: "charlotte.hayes@example.com", source: "meta", stage: "closed_lost", doctor: null, tags: ["quoted"], channel: "email", lastActivity: "74 days ago" },
  { id: "p12", first: "Thomas", last: "Reid", phone: "07700 900152", email: "thomas.reid@example.com", source: "google", stage: "closed_lost", doctor: null, tags: ["quoted"], channel: "email", lastActivity: "102 days ago" },
  { id: "p13", first: "Aisha", last: "Patel", phone: "07700 900153", email: "aisha.patel@example.com", source: "other", stage: "closed_lost", doctor: null, tags: [], channel: "email", lastActivity: "138 days ago" },
  { id: "p14", first: "Jack", last: "Turner", phone: "07700 900154", email: "jack.turner@example.com", source: "manual", stage: "contacted", doctor: "d1", tags: [], channel: "sms", lastActivity: "6 days ago" },
];

export type DemoMessage = {
  dir: "in" | "out";
  channel: string;
  body: string;
  when: string;
  campaign?: string;
};

export const DEMO_THREADS: Record<string, DemoMessage[]> = {
  p1: [
    { dir: "out", channel: "whatsapp", when: "Today 09:02", campaign: "New enquiry follow-up", body: "Hi Priya, it's Sarah at Fernwell Dental. Thanks for getting in touch - we've got your enquiry. What's the main thing you'd like help with: a check-up, a cosmetic change, or something that's bothering you?\n\nReply STOP to opt out." },
    { dir: "in", channel: "whatsapp", when: "Today 09:14", body: "Hi! Hoping to get my teeth straightened before my wedding in the spring. Is Invisalign possible in that time?" },
  ],
  p3: [
    { dir: "in", channel: "whatsapp", when: "Mon 16:40", body: "Hello, how much is teeth whitening?" },
    { dir: "out", channel: "whatsapp", when: "Mon 16:52", body: "Hi Zara, whitening starts from a free chat with Dr Clarke so we can check your teeth are suitable. Would Thursday or Friday suit you better?" },
    { dir: "in", channel: "whatsapp", when: "Mon 17:05", body: "Friday after work would be great" },
  ],
  p5: [
    { dir: "in", channel: "whatsapp", when: "Sun 11:20", body: "I'm quite nervous about dentists to be honest. Can I just come and talk first?" },
    { dir: "out", channel: "whatsapp", when: "Sun 11:34", body: "Of course, Olivia - that's exactly what the first visit is. No treatment, just a chat and a look round. We'll go at your pace." },
    { dir: "out", channel: "email", when: "Sun 11:40", body: "Your consultation is booked for Thursday at 10:30 with Dr Clarke. See you then!" },
  ],
  p7: [
    { dir: "in", channel: "instagram", when: "Fri 20:15", body: "Saw your implant before and after post. Do you do payment plans?" },
    { dir: "out", channel: "instagram", when: "Sat 09:10", body: "Hi Sofia! Yes we do, interest-free over 12 months on most treatment. Dr Clarke can go through the options at your consultation." },
  ],
  p11: [
    { dir: "out", channel: "email", when: "Mon 10:12", campaign: "Lost quote win-back", body: "Hi Charlotte, it's Sarah at Fernwell Dental. You got in touch a while back about your teeth, and I wanted to ask - did you ever get it sorted?\n\n--\nIf you'd rather not hear from us, just reply STOP and we'll take you off the list." },
    { dir: "in", channel: "email", when: "Mon 11:47", body: "Hi Sarah, honestly the price put me off. Is there any flexibility?" },
  ],
};

export type DemoCampaignStep = {
  delay: string;
  channel: string;
  subject: string;
  body: string;
};

export type DemoEvent = {
  who: string;
  step: number;
  channel: string;
  status: "sent" | "skipped" | "failed";
  detail: string;
  when: string;
};

export type DemoCampaign = {
  id: string;
  name: string;
  kind: "nurture" | "reactivation";
  status: "Running" | "Paused";
  audience: string;
  rules: string[];
  stats: { inSequence: number; replied: number; finished: number; optedOut: number; sent: number };
  events: DemoEvent[];
};

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: "nurture",
    name: "New enquiry follow-up",
    kind: "nurture",
    status: "Running",
    audience: "New leads from any source, enrolled automatically as they arrive",
    rules: ["Up to 60 messages a day", "Sends 09:00-18:00 UK, Monday to Saturday"],
    stats: { inSequence: 6, replied: 11, finished: 4, optedOut: 1, sent: 52 },
    events: [
      { who: "Priya Nair", step: 1, channel: "whatsapp", status: "sent", detail: "", when: "Today 09:02" },
      { who: "Liam Walsh", step: 1, channel: "instagram", status: "sent", detail: "", when: "Today 08:31" },
      { who: "Callum Price", step: 3, channel: "email", status: "sent", detail: "", when: "Yesterday 14:20" },
      { who: "Hannah Moore", step: 2, channel: "email", status: "skipped", detail: "No email address on file.", when: "Yesterday 11:05" },
      { who: "Ravi Menon", step: 5, channel: "email", status: "sent", detail: "", when: "Mon 15:42" },
    ],
  },
  {
    id: "reactivation",
    name: "Lost quote win-back",
    kind: "reactivation",
    status: "Running",
    audience: "Closed lost or contacted, quiet for 30+ days. Enrolled in batches of 10",
    rules: ["Up to 20 messages a day", "Stops the moment someone replies or books"],
    stats: { inSequence: 14, replied: 9, finished: 3, optedOut: 2, sent: 61 },
    events: [
      { who: "Charlotte Hayes", step: 1, channel: "email", status: "sent", detail: "", when: "Mon 10:12" },
      { who: "Thomas Reid", step: 2, channel: "email", status: "sent", detail: "", when: "Mon 09:48" },
      { who: "Aisha Patel", step: 1, channel: "email", status: "sent", detail: "", when: "Sat 11:30" },
      { who: "Ben Alvarez", step: 4, channel: "email", status: "sent", detail: "", when: "Sat 10:05" },
      { who: "Nina Fox", step: 3, channel: "email", status: "failed", detail: "Mailbox rejected the address.", when: "Fri 16:10" },
    ],
  },
];
