"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { setIntegration } from "@/lib/integrations/store";
import { testInstagramConnection } from "@/lib/integrations/instagram";
import { deleteSecret, setSecret, SECRET } from "@/lib/integrations/secrets";

function back(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

export async function connectInstagram(formData: FormData) {
  await requireAdmin();

  const token = (formData.get("access_token") as string).trim();

  if (!token) {
    back("Paste the Instagram access token.");
  }

  let username = "";
  let failure: string | null = null;
  try {
    ({ username } = await testInstagramConnection(token));
    await setSecret(SECRET.instagramAccessToken, token);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not connect to Instagram.";
  }
  if (failure) back(failure);

  await setIntegration("instagram", {
    status: "connected",
    config: { username },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectInstagram() {
  await requireAdmin();
  await deleteSecret(SECRET.instagramAccessToken);
  await setIntegration("instagram", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
