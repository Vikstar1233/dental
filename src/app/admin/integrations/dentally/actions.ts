"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { setIntegration } from "@/lib/integrations/store";
import { testDentallyConnection } from "@/lib/integrations/dentally";
import { deleteSecret, setSecret, SECRET } from "@/lib/integrations/secrets";

function back(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

export async function connectDentally(formData: FormData) {
  await requireAdmin();

  const authHeader = (formData.get("auth_header") as string).trim();
  const paymentPlanId = (formData.get("default_payment_plan_id") as string).trim();

  if (!authHeader) {
    back("Paste the Authorization header value Dentally gave you.");
  }

  let failure: string | null = null;
  try {
    await testDentallyConnection(authHeader);
    await setSecret(SECRET.dentallyAuthHeader, authHeader);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not connect to Dentally.";
  }
  if (failure) back(failure);

  await setIntegration("dentally", {
    status: "connected",
    config: { default_payment_plan_id: paymentPlanId || null },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectDentally() {
  await requireAdmin();
  await deleteSecret(SECRET.dentallyAuthHeader);
  await setIntegration("dentally", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
