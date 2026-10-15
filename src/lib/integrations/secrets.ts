import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Every integration key lives in Supabase Vault (encrypted in the
// database), never in code, env files, or the integrations table. These
// helpers are the only way in, and only server code with the service-role
// key can reach them -- the SQL functions are locked to that role.
export const SECRET = {
  aircallApiToken: "aircall_api_token",
  dentallyAuthHeader: "dentally_auth_header",
  emailPassword: "email_smtp_password",
  metaAppId: "meta_app_id",
  metaAppSecret: "meta_app_secret",
  metaVerifyToken: "meta_verify_token",
  metaPageToken: "meta_page_access_token",
  metaPendingPages: "meta_pending_pages",
  whatsappAccessToken: "whatsapp_access_token",
  instagramAccessToken: "instagram_access_token",
} as const;

function explain(message: string) {
  if (message.includes("Could not find the function")) {
    return "Secure key storage isn't set up in your database yet -- run supabase/008_vault_secrets.sql in the SQL Editor.";
  }
  return message;
}

export async function setSecret(name: string, value: string) {
  const { error } = await createAdminClient().rpc("set_integration_secret", {
    p_name: name,
    p_secret: value,
  });
  if (error) throw new Error(explain(error.message));
}

export async function getSecret(name: string): Promise<string | null> {
  const { data, error } = await createAdminClient().rpc("get_integration_secret", {
    p_name: name,
  });
  if (error) throw new Error(explain(error.message));
  return (data as string | null) ?? null;
}

export async function deleteSecret(name: string) {
  const { error } = await createAdminClient().rpc("delete_integration_secret", {
    p_name: name,
  });
  if (error) throw new Error(explain(error.message));
}

// For the Integrations page to warn when the migration hasn't been run.
export async function secretStoreReady() {
  const { error } = await createAdminClient().rpc("get_integration_secret", {
    p_name: "__probe__",
  });
  return !error;
}
