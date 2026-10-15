import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireAdmin } from "@/lib/require-admin";
import { buildMetaAuthUrl, getMetaApp } from "@/lib/integrations/meta";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const app = await getMetaApp();
  if (!app) {
    return NextResponse.redirect(
      new URL(
        "/admin/integrations?error=" +
          encodeURIComponent("Save your Meta App ID and App Secret first."),
        request.url,
      ),
    );
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return NextResponse.redirect(buildMetaAuthUrl(state, app));
}
