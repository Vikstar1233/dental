"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { setIntegration } from "@/lib/integrations/store";
import { testWhatsAppConnection } from "@/lib/integrations/whatsapp";
import { deleteSecret, setSecret, SECRET } from "@/lib/integrations/secrets";

function back(message: string): never {
  redirect(`/admin/integrations?error=${encodeURIComponent(message)}`);
}

export async function connectWhatsApp(formData: FormData) {
  await requireAdmin();

  const phoneNumberId = (formData.get("phone_number_id") as string).trim();
  const token = (formData.get("access_token") as string).trim();

  if (!phoneNumberId || !token) {
    back("Enter both the phone number ID and the access token.");
  }

  let info: { displayPhoneNumber: string; verifiedName: string } | null = null;
  let failure: string | null = null;
  try {
    info = await testWhatsAppConnection({ phoneNumberId, token });
    await setSecret(SECRET.whatsappAccessToken, token);
  } catch (err) {
    failure = err instanceof Error ? err.message : "Could not connect to WhatsApp.";
  }
  if (failure || !info) back(failure ?? "Could not connect to WhatsApp.");

  await setIntegration("whatsapp", {
    status: "connected",
    config: {
      phone_number_id: phoneNumberId,
      display_phone_number: info.displayPhoneNumber,
      verified_name: info.verifiedName,
    },
  });

  redirect("/admin/integrations?success=1");
}

export async function disconnectWhatsApp() {
  await requireAdmin();
  await deleteSecret(SECRET.whatsappAccessToken);
  await setIntegration("whatsapp", { status: "not_connected", config: {} });
  redirect("/admin/integrations?success=1");
}
