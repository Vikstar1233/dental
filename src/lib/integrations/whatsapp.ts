import "server-only";
import { GRAPH_URL } from "@/lib/integrations/meta";

// WhatsApp wants the number as digits with country code and no "+".
// Patient numbers are stored however they were typed, so UK local format
// (07700 900123) is converted to 447700900123.
export function toWhatsAppNumber(phone: string) {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "44" + digits.slice(1);
  return digits;
}

type GraphError = { error?: { message?: string; code?: number } };

async function readError(res: Response): Promise<GraphError["error"]> {
  const body = (await res.json().catch(() => null)) as GraphError | null;
  return body?.error;
}

// Looking up the phone number proves in one call that the token is valid
// and that the number ID belongs to it.
export async function testWhatsAppConnection({
  phoneNumberId,
  token,
}: {
  phoneNumberId: string;
  token: string;
}) {
  const res = await fetch(
    `${GRAPH_URL}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    const err = await readError(res);
    if (err?.code === 190 || res.status === 401) {
      throw new Error("WhatsApp rejected that access token.");
    }
    throw new Error(
      err?.message
        ? `WhatsApp couldn't use that phone number ID: ${err.message}`
        : "WhatsApp couldn't use that phone number ID.",
    );
  }

  const data = (await res.json()) as {
    display_phone_number?: string;
    verified_name?: string;
  };
  return {
    displayPhoneNumber: data.display_phone_number ?? "",
    verifiedName: data.verified_name ?? "",
  };
}

// Free-form text only works inside 24 hours of the patient's last message;
// outside that WhatsApp requires an approved template (not built yet).
export async function sendWhatsAppText({
  phoneNumberId,
  token,
  to,
  body,
}: {
  phoneNumberId: string;
  token: string;
  to: string;
  body: string;
}): Promise<string> {
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toWhatsAppNumber(to),
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const err = await readError(res);
    if (err?.code === 131047) {
      throw new Error(
        "It's been more than 24 hours since this patient last messaged on WhatsApp, so WhatsApp only allows an approved template message now.",
      );
    }
    if (err?.code === 131030) {
      throw new Error("That number isn't on the allowed list for this WhatsApp number yet.");
    }
    throw new Error(err?.message ?? `WhatsApp returned an error (${res.status}).`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? "";
}
