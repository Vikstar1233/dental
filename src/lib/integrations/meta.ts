import "server-only";
import crypto from "node:crypto";
import { getSecret, SECRET } from "@/lib/integrations/secrets";

// Bump when Meta deprecates this version (~2 year window per version).
const GRAPH_API_VERSION = "v25.0";
export const GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// The Meta app's credentials, saved from the Integrations page and kept
// in Vault -- not in .env, not in code.
export type MetaApp = { appId: string; appSecret: string; verifyToken: string };

export async function getMetaApp(): Promise<MetaApp | null> {
  try {
    const [appId, appSecret, verifyToken] = await Promise.all([
      getSecret(SECRET.metaAppId),
      getSecret(SECRET.metaAppSecret),
      getSecret(SECRET.metaVerifyToken),
    ]);
    if (!appId || !appSecret || !verifyToken) return null;
    return { appId, appSecret, verifyToken };
  } catch {
    return null;
  }
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL!;
}

export function metaCallbackUrl() {
  return `${siteUrl()}/admin/integrations/meta/callback`;
}

export function metaWebhookUrl() {
  return `${siteUrl()}/api/webhooks/meta-leads`;
}

// WhatsApp and Instagram messages both arrive here.
export function metaMessagesWebhookUrl() {
  return `${siteUrl()}/api/webhooks/meta-messages`;
}

// Step 1 of OAuth: send the admin's browser to Meta's consent screen.
export function buildMetaAuthUrl(state: string, app: MetaApp) {
  const params = new URLSearchParams({
    client_id: app.appId,
    redirect_uri: metaCallbackUrl(),
    state,
    response_type: "code",
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "leads_retrieval",
    ].join(","),
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
}

type TokenResponse = { access_token: string; token_type: string; expires_in?: number };

// Step 2: exchange the ?code= from the callback for a short-lived user token.
export async function exchangeCodeForToken(code: string, app: MetaApp): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: app.appId,
    client_secret: app.appSecret,
    redirect_uri: metaCallbackUrl(),
    code,
  });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  return res.json();
}

// Step 3: trade the short-lived token for one that lasts ~60 days.
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  app: MetaApp,
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: app.appId,
    client_secret: app.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(`Meta long-lived exchange failed: ${await res.text()}`);
  return res.json();
}

export type MetaPage = { id: string; name: string; access_token: string };

// Pages returned here carry their own page-scoped token, which inherits
// the long-lived-ness of the user token used to fetch it.
export async function fetchPages(userAccessToken: string): Promise<MetaPage[]> {
  const res = await fetch(
    `${GRAPH_URL}/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`,
  );
  if (!res.ok) throw new Error(`Fetching pages failed: ${await res.text()}`);
  const { data } = await res.json();
  return data;
}

export type MetaLeadForm = { id: string; name: string; status: string };

export async function fetchLeadForms(
  pageId: string,
  pageAccessToken: string,
): Promise<MetaLeadForm[]> {
  const res = await fetch(
    `${GRAPH_URL}/${pageId}/leadgen_forms?access_token=${encodeURIComponent(pageAccessToken)}`,
  );
  if (!res.ok) throw new Error(`Fetching lead forms failed: ${await res.text()}`);
  const { data } = await res.json();
  return data;
}

// One-time-per-page step so Meta actually delivers "leadgen" events for
// this page to the app's webhook URL (configured separately, at the App
// level, in Meta's dashboard).
export async function subscribePageToLeadgen(
  pageId: string,
  pageAccessToken: string,
) {
  const res = await fetch(
    `${GRAPH_URL}/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(pageAccessToken)}`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`Page subscription failed: ${await res.text()}`);
}

export type MetaLeadField = { name: string; values: string[] };

export async function fetchLeadData(
  leadgenId: string,
  pageAccessToken: string,
): Promise<{ field_data: MetaLeadField[]; created_time: string }> {
  const res = await fetch(
    `${GRAPH_URL}/${leadgenId}?access_token=${encodeURIComponent(pageAccessToken)}`,
  );
  if (!res.ok) throw new Error(`Fetching lead data failed: ${await res.text()}`);
  return res.json();
}

// Meta signs every webhook POST body with the App Secret so we can tell a
// real Meta event apart from anyone else who discovers the URL.
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  );
}
