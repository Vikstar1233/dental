import type { MetaLeadField } from "./meta";

// Meta lead forms are custom-built by the Page owner, so field names vary
// per form ("full_name" vs "Name" vs "your_name"). This does a best-effort
// match on common patterns rather than assuming a fixed schema.
export function parseMetaLead(fields: MetaLeadField[]) {
  const get = (pattern: RegExp) =>
    fields.find((f) => pattern.test(f.name))?.values?.[0]?.trim() ?? "";

  const fullName = get(/full[_ ]?name|^name$/i);
  const firstName = get(/first[_ ]?name/i) || fullName.split(" ")[0] || "Unknown";
  const lastName =
    get(/last[_ ]?name/i) || fullName.split(" ").slice(1).join(" ") || "";

  return {
    first_name: firstName,
    last_name: lastName,
    email: get(/email/i) || null,
    phone: get(/phone/i) || null,
  };
}
