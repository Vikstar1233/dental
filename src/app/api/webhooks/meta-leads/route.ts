import { NextRequest, NextResponse } from "next/server";
import { fetchLeadData, getMetaApp, verifyMetaSignature } from "@/lib/integrations/meta";
import { parseMetaLead } from "@/lib/integrations/parse-meta-lead";
import { getSecret, SECRET } from "@/lib/integrations/secrets";
import { getIntegration, setIntegration } from "@/lib/integrations/store";
import { createAdminClient } from "@/lib/supabase/admin";

// One-time handshake Meta does when you save the webhook URL in the App
// dashboard: echo back hub.challenge if the verify token matches.
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

type MetaConfig = {
  selected_form_ids?: string[];
};

// Meta retries aggressively on anything but a 200, so this always returns
// 200 once the signature checks out -- failures are logged, not retried.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const app = await getMetaApp();
  if (!app || !verifyMetaSignature(rawBody, signature, app.appSecret)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const payload = JSON.parse(rawBody);
  const integration = await getIntegration("meta");
  const config = (integration?.config ?? {}) as MetaConfig;
  const pageToken = await getSecret(SECRET.metaPageToken);

  if (integration?.status !== "connected" || !pageToken) {
    return NextResponse.json({ ok: true, skipped: "not connected" });
  }

  const admin = createAdminClient();
  let received = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;

      const { leadgen_id: leadgenId, form_id: formId } = change.value ?? {};
      if (!leadgenId) continue;

      if (
        config.selected_form_ids?.length &&
        !config.selected_form_ids.includes(formId)
      ) {
        continue;
      }

      try {
        const lead = await fetchLeadData(leadgenId, pageToken);
        const parsed = parseMetaLead(lead.field_data);

        // onConflict + ignoreDuplicates makes a redelivered webhook a
        // no-op instead of a duplicate patient.
        await admin.from("patients").upsert(
          { ...parsed, source: "meta", external_lead_id: leadgenId },
          { onConflict: "external_lead_id", ignoreDuplicates: true },
        );
        received += 1;
      } catch (err) {
        console.error("Meta lead ingestion failed", leadgenId, err);
      }
    }
  }

  if (received > 0) {
    await setIntegration("meta", { last_event_at: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true, received });
}
