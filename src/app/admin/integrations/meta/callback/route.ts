import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/require-admin";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchPages,
  getMetaApp,
} from "@/lib/integrations/meta";
import { finishMetaConnection } from "@/lib/integrations/meta-connect";
import { setSecret, SECRET } from "@/lib/integrations/secrets";
import { setIntegration } from "@/lib/integrations/store";

function backToIntegrations(request: NextRequest, params: Record<string, string>) {
  return NextResponse.redirect(
    new URL(`/admin/integrations?${new URLSearchParams(params)}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (!code || !state || state !== expectedState) {
    return backToIntegrations(request, {
      error: "Meta sign-in failed or expired. Try connecting again.",
    });
  }

  try {
    const app = await getMetaApp();
    if (!app) throw new Error("Save your Meta App ID and App Secret first.");

    const shortLived = await exchangeCodeForToken(code, app);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, app);
    const pages = await fetchPages(longLived.access_token);

    if (pages.length === 0) {
      return backToIntegrations(request, {
        error: "No Facebook Pages found for this account.",
      });
    }

    // One Page: nothing to choose, so connect it straight away.
    if (pages.length === 1) {
      await finishMetaConnection(pages[0]);
      return backToIntegrations(request, { success: "1" });
    }

    // Several Pages: the list of names goes in the table, but each Page's
    // access token is held in Vault until one is picked.
    await setSecret(SECRET.metaPendingPages, JSON.stringify(pages));
    await setIntegration("meta", {
      status: "pending",
      config: { pending_pages: pages.map((p) => ({ id: p.id, name: p.name })) },
    });

    return NextResponse.redirect(
      new URL("/admin/integrations/meta/choose-page", request.url),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed.";
    await setIntegration("meta", { status: "error", config: { error: message } });
    return backToIntegrations(request, { error: message });
  }
}
