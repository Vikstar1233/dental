import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Provider =
  | "meta"
  | "whatsapp"
  | "instagram"
  | "email"
  | "aircall"
  | "dentally";

// Only ever called from server code with the service-role client -- the
// integrations table has RLS on and no policies, so this is the only way
// in. Callers must redact `config` themselves before it reaches a page;
// nothing here does that automatically.
export async function getIntegration(provider: Provider) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integrations")
    .select("provider, status, config, last_event_at, updated_at")
    .eq("provider", provider)
    .single();
  return data;
}

export async function getAllIntegrations() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integrations")
    .select("provider, status, config, last_event_at, updated_at");
  return data ?? [];
}

export async function setIntegration(
  provider: Provider,
  patch: { status?: string; config?: Record<string, unknown>; last_event_at?: string },
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("integrations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}

export async function mergeIntegrationConfig(
  provider: Provider,
  patch: Record<string, unknown>,
) {
  const current = await getIntegration(provider);
  await setIntegration(provider, {
    config: { ...(current?.config as Record<string, unknown> | undefined), ...patch },
  });
}
