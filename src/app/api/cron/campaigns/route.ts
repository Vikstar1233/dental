import { NextRequest, NextResponse } from "next/server";
import { runCampaigns } from "@/lib/campaigns/engine";

// Called every few minutes by the scheduler (see netlify/functions). Safe to
// call as often as you like: the engine only acts on steps that are due,
// inside the send window, within each campaign's daily limit.
//
// If a CRON_SECRET environment variable is set, callers must send it as a
// bearer token. It's an optional extra lock, not a requirement.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const summary = await runCampaigns();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("Campaign run failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
