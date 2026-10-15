"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { finishMetaConnection } from "@/lib/integrations/meta-connect";
import { deleteSecret, getSecret, setSecret, SECRET } from "@/lib/integrations/secrets";
import { getIntegration, setIntegration } from "@/lib/integrations/store";
import type { MetaPage } from "@/lib/integrations/meta";

function back(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

type MetaConfig = {
  available_forms?: { id: string; name: string; status: string }[];
  selected_form_ids?: string[];
  [key: string]: unknown;
};

// Saves the Meta app's credentials once, into Vault. The webhook verify
// token is generated here (any random string works) and shown on the
// Integrations page to paste into Meta's Webhooks settings.
export async function saveMetaApp(formData: FormData) {
  await requireAdmin();

  const appId = (formData.get("app_id") as string).trim();
  const appSecret = (formData.get("app_secret") as string).trim();

  if (!appId || !appSecret) {
    back("Enter both the App ID and the App Secret.");
  }

  let failure: string | null = null;
  try {
    await setSecret(SECRET.metaAppId, appId);
    await setSecret(SECRET.metaAppSecret, appSecret);
    if (!(await getSecret(SECRET.metaVerifyToken))) {
      await setSecret(SECRET.metaVerifyToken, crypto.randomBytes(24).toString("hex"));
    }
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not store the credentials.";
  }
  if (failure) back(failure);

  redirect("/admin/integrations?success=1");
}

export async function removeMetaApp() {
  await requireAdmin();
  await Promise.all([
    deleteSecret(SECRET.metaAppId),
    deleteSecret(SECRET.metaAppSecret),
    deleteSecret(SECRET.metaVerifyToken),
    deleteSecret(SECRET.metaPageToken),
    deleteSecret(SECRET.metaPendingPages),
  ]);
  await setIntegration("meta", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}

export async function choosePage(formData: FormData) {
  await requireAdmin();

  const pageId = formData.get("page_id") as string;

  let page: MetaPage | undefined;
  let failure: string | null = null;
  try {
    const raw = await getSecret(SECRET.metaPendingPages);
    page = (raw ? (JSON.parse(raw) as MetaPage[]) : []).find((p) => p.id === pageId);
    if (!page) throw new Error("Page not found -- try connecting again.");
    await finishMetaConnection(page);
    await deleteSecret(SECRET.metaPendingPages);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not connect this Page.";
  }
  if (failure) back(failure);

  redirect("/admin/integrations?success=1");
}

export async function selectForms(formData: FormData) {
  await requireAdmin();

  const selectedFormIds = formData.getAll("form_id") as string[];
  const integration = await getIntegration("meta");
  const config = (integration?.config ?? {}) as MetaConfig;

  await setIntegration("meta", {
    status: "connected",
    config: { ...config, selected_form_ids: selectedFormIds },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectMeta() {
  await requireAdmin();
  await deleteSecret(SECRET.metaPageToken);
  await setIntegration("meta", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
