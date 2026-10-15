"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { setIntegration } from "@/lib/integrations/store";
import { testAircallConnection } from "@/lib/integrations/aircall";
import { deleteSecret, setSecret, SECRET } from "@/lib/integrations/secrets";

function back(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

export async function connectAircall(formData: FormData) {
  await requireAdmin();

  const apiId = (formData.get("api_id") as string).trim();
  const apiToken = (formData.get("api_token") as string).trim();
  const numberId = Number((formData.get("number_id") as string).trim());

  if (!apiId || !apiToken || !numberId) {
    back("Fill in all three Aircall fields.");
  }

  let failure: string | null = null;
  try {
    await testAircallConnection({ apiId, apiToken, numberId });
    await setSecret(SECRET.aircallApiToken, apiToken);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not connect to Aircall.";
  }
  if (failure) back(failure);

  await setIntegration("aircall", {
    status: "connected",
    config: { api_id: apiId, number_id: numberId },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectAircall() {
  await requireAdmin();
  await deleteSecret(SECRET.aircallApiToken);
  await setIntegration("aircall", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
