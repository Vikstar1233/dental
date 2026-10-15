import "server-only";
import { getIntegration } from "@/lib/integrations/store";
import { getSecret, SECRET } from "@/lib/integrations/secrets";

export type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromAddress: string;
};

// The connected mailbox, or null if none is connected. Non-secret details
// come from the integrations row; the password comes from Vault.
export async function getEmailConfig(): Promise<EmailConfig | null> {
  const integration = await getIntegration("email");
  if (integration?.status !== "connected") return null;

  const c = (integration.config ?? {}) as {
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    from_name?: string;
    from_address?: string;
  };
  const password = await getSecret(SECRET.emailPassword);

  if (!c.host || !c.port || !c.username || !password) return null;

  return {
    host: c.host,
    port: c.port,
    secure: !!c.secure,
    username: c.username,
    password,
    fromName: c.from_name || "Patient Portal",
    fromAddress: c.from_address || c.username,
  };
}
