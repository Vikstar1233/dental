import { NextRequest, NextResponse } from "next/server";
import { getMetaApp, verifyMetaSignature } from "@/lib/integrations/meta";
import { fetchInstagramName } from "@/lib/integrations/instagram";
import { recordDeliveryStatus, recordInbound } from "@/lib/integrations/inbound";
import { getSecret, SECRET } from "@/lib/integrations/secrets";

// One-time handshake Meta does when you save the callback URL for the
// WhatsApp or Instagram product: echo hub.challenge if the token matches.
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const app = await getMetaApp();

  if (app && mode === "subscribe" && token === app.verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppValue = {
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: {
    id: string;
    from: string;
    type: string;
    text?: { body?: string };
  }[];
  statuses?: { id: string; status: string }[];
};

type InstagramEvent = {
  sender?: { id: string };
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: unknown[];
  };
};

// Always 200 once the signature checks out -- Meta retries hard on anything
// else, and one bad message shouldn't make it resend the whole batch.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const app = await getMetaApp();
  if (!app || !verifyMetaSignature(rawBody, signature, app.appSecret)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const payload = JSON.parse(rawBody);
  let handled = 0;

  try {
    if (payload.object === "whatsapp_business_account") {
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "messages") continue;
          const value = (change.value ?? {}) as WhatsAppValue;

          for (const m of value.messages ?? []) {
            const name = value.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
            await recordInbound({
              channel: "whatsapp",
              externalId: m.id,
              waId: m.from,
              name,
              body: m.type === "text" ? (m.text?.body ?? "") : `[${m.type} received]`,
            });
            handled += 1;
          }

          for (const s of value.statuses ?? []) {
            await recordDeliveryStatus(s.id, s.status);
          }
        }
      }
    } else if (payload.object === "instagram") {
      const token = await getSecret(SECRET.instagramAccessToken);

      for (const entry of payload.entry ?? []) {
        for (const event of (entry.messaging ?? []) as InstagramEvent[]) {
          // Copies of our own outgoing messages come back as "echoes".
          if (!event.sender?.id || !event.message || event.message.is_echo) continue;

          const igsid = event.sender.id;
          await recordInbound({
            channel: "instagram",
            externalId: event.message.mid,
            igsid,
            body: event.message.text ?? "[attachment received]",
            resolveName: token ? () => fetchInstagramName(token, igsid) : undefined,
          });
          handled += 1;
        }
      }
    }
  } catch (err) {
    console.error("Messaging webhook failed", err);
  }

  return NextResponse.json({ ok: true, handled });
}
