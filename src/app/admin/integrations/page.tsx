import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { getAllIntegrations } from "@/lib/integrations/store";
import {
  getMetaApp,
  metaMessagesWebhookUrl,
  metaWebhookUrl,
} from "@/lib/integrations/meta";
import { secretStoreReady } from "@/lib/integrations/secrets";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { disconnectMeta, removeMetaApp, saveMetaApp } from "./meta/actions";
import { connectAircall, disconnectAircall } from "./aircall/actions";
import { connectDentally, disconnectDentally } from "./dentally/actions";
import { connectEmail, disconnectEmail } from "./email/actions";
import { connectWhatsApp, disconnectWhatsApp } from "./whatsapp/actions";
import { connectInstagram, disconnectInstagram } from "./instagram/actions";

const PROVIDER_LABEL: Record<string, string> = {
  meta: "Meta (Facebook & Instagram lead forms)",
  whatsapp: "WhatsApp Cloud API",
  instagram: "Instagram",
  email: "Email",
  aircall: "Aircall",
  dentally: "Dentally",
};

const STATUS_STYLE: Record<string, string> = {
  connected: "text-[var(--teal)]",
  pending: "text-[var(--warn)]",
  error: "text-[var(--danger)]",
  not_connected: "text-[var(--muted)]",
};

const cardClass =
  "rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm";

// Shown under both messaging cards: where incoming messages get delivered.
function MessagingWebhookHelp({
  metaApp,
  product,
}: {
  metaApp: { verifyToken: string } | null;
  product: string;
}) {
  if (!metaApp) {
    return (
      <p className="mt-4 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
        To receive replies, first save your Meta app&apos;s App ID and Secret
        in the{" "}
        <a href="#meta" className="font-medium underline">
          Meta card at the top of this page
        </a>{" "}
        &mdash; they&apos;re used to check that incoming messages really come
        from Meta.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-1.5 text-xs text-[var(--muted)]">
      <p>
        To receive replies, in your Meta app open {product} &rarr;
        Configuration and paste:
      </p>
      <p>
        Callback URL:{" "}
        <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
          {metaMessagesWebhookUrl()}
        </code>
      </p>
      <p>
        Verify token:{" "}
        <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
          {metaApp.verifyToken}
        </code>
      </p>
      <p>
        Then subscribe to{" "}
        <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
          messages
        </code>
        .
      </p>
    </div>
  );
}

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const { error, success } = await searchParams;

  const [integrations, storeReady, metaApp] = await Promise.all([
    getAllIntegrations(),
    secretStoreReady(),
    getMetaApp(),
  ]);
  const tableReady = integrations.length > 0;
  const { error: messagingSchemaError } = await createAdminClient()
    .from("patients")
    .select("instagram_scoped_id")
    .limit(1);
  const messagingReady = !messagingSchemaError;
  const missingMigrations = [
    !tableReady && "005_integrations.sql",
    !storeReady && "008_vault_secrets.sql",
    !messagingReady && "009_messaging.sql",
  ].filter(Boolean) as string[];
  const meta = integrations.find((i) => i.provider === "meta");
  const metaConfig = (meta?.config ?? {}) as {
    page_name?: string;
    selected_form_ids?: string[];
    error?: string;
  };
  const aircall = integrations.find((i) => i.provider === "aircall");
  const aircallConfig = (aircall?.config ?? {}) as {
    api_id?: string;
    number_id?: number;
  };
  const dentally = integrations.find((i) => i.provider === "dentally");
  const dentallyConfig = (dentally?.config ?? {}) as {
    default_payment_plan_id?: string;
  };
  const whatsapp = integrations.find((i) => i.provider === "whatsapp");
  const whatsappConfig = (whatsapp?.config ?? {}) as {
    verified_name?: string;
    display_phone_number?: string;
  };
  const instagram = integrations.find((i) => i.provider === "instagram");
  const instagramConfig = (instagram?.config ?? {}) as { username?: string };
  const email = integrations.find((i) => i.provider === "email");
  const emailConfig = (email?.config ?? {}) as {
    host?: string;
    port?: number;
    username?: string;
    from_name?: string;
    from_address?: string;
  };

  const supabase = await createClient();
  const { data: recentLeads } = await supabase
    .from("patients")
    .select("id, first_name, last_name, created_at")
    .eq("source", "meta")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="px-10 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl text-[var(--ink)]">
          Integrations
        </h1>

        {missingMigrations.length > 0 && (
          <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
            <p className="font-medium">One-time database setup needed</p>
            <p className="mt-1">
              Run{" "}
              {missingMigrations.map((name, i) => (
                <span key={name}>
                  {i > 0 && (i === missingMigrations.length - 1 ? " and " : ", ")}
                  <code className="font-data">{name}</code>
                </span>
              ))}{" "}
              in your Supabase SQL Editor. Until then, some connections
              can&apos;t be saved.
            </p>
          </div>
        )}

        <p className="text-xs text-[var(--muted)]">
          Keys you enter here are encrypted in your database (Supabase Vault).
          They&apos;re never written into code, never shown again after
          saving, and never sent to anyone&apos;s browser.
        </p>

        {error && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)] px-4 py-2.5 text-sm text-[var(--teal-deep)]">
            Done.
          </div>
        )}

        {/* Meta -- fully wired */}
        <div id="meta" className={`${cardClass} scroll-mt-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.meta}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[meta?.status ?? "not_connected"]}`}
            >
              {(meta?.status ?? "not_connected") === "not_connected"
                ? "Not connected"
                : (meta?.status ?? "").charAt(0).toUpperCase() +
                  (meta?.status ?? "").slice(1)}
            </span>
          </div>

          {meta?.status === "connected" && (
            <div className="mt-3 space-y-1 text-sm text-[var(--ink)]">
              <p>
                Page: <span className="font-medium">{metaConfig.page_name}</span>
              </p>
              <p>
                Listening to {metaConfig.selected_form_ids?.length ?? 0} lead
                form{metaConfig.selected_form_ids?.length === 1 ? "" : "s"}
              </p>
              {meta.last_event_at && (
                <p className="font-data text-xs text-[var(--muted)]">
                  Last lead received{" "}
                  {new Date(meta.last_event_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {meta?.status === "error" && metaConfig.error && (
            <p className="mt-3 text-sm text-[var(--danger)]">{metaConfig.error}</p>
          )}

          {metaApp ? (
            <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
              <p>
                Meta app{" "}
                <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
                  {metaApp.appId}
                </code>{" "}
                &middot; App Secret saved securely and never shown again.
              </p>
              <p>
                Webhook URL:{" "}
                <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
                  {metaWebhookUrl()}
                </code>
              </p>
              <p>
                Verify token:{" "}
                <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
                  {metaApp.verifyToken}
                </code>
              </p>
              <p>
                One-time setup: paste those two into your Meta App&apos;s
                Webhooks product, on the{" "}
                <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
                  page
                </code>{" "}
                object, subscribed to{" "}
                <code className="rounded bg-[var(--porcelain)] px-1 py-0.5 font-data">
                  leadgen
                </code>
                .
              </p>
            </div>
          ) : (
            <form action={saveMetaApp} className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-xs text-[var(--muted)] sm:col-span-2">
                Paste these once from your Meta app&apos;s Settings &rarr;
                Basic. They&apos;re encrypted in your database, never stored
                in code.
              </p>
              <input
                name="app_id"
                type="text"
                placeholder="App ID"
                required
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
              <input
                name="app_secret"
                type="password"
                placeholder="App Secret"
                required
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)] sm:col-span-2"
              >
                Save securely
              </button>
            </form>
          )}

          {metaApp && (
            <div className="mt-4 flex flex-wrap gap-2">
              {meta?.status === "connected" ? (
                <>
                  <Link
                    href="/admin/integrations/meta/choose-forms"
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                  >
                    Change forms
                  </Link>
                  <form action={disconnectMeta}>
                    <button
                      type="submit"
                      className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                    >
                      Disconnect
                    </button>
                  </form>
                </>
              ) : (
                <a
                  href="/admin/integrations/meta/connect"
                  className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
                >
                  Connect Facebook Page
                </a>
              )}
              <form action={removeMetaApp}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--danger)]"
                >
                  Remove app credentials
                </button>
              </form>
            </div>
          )}
        </div>

        {meta?.status === "connected" && (
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
              Last 20 leads received
            </h2>
            <div className="space-y-1 text-sm">
              {recentLeads?.map((lead) => (
                <div
                  key={lead.id}
                  className="flex justify-between border-b border-[var(--line)] py-1.5 last:border-0"
                >
                  <span className="text-[var(--ink)]">
                    {lead.first_name} {lead.last_name}
                  </span>
                  <span className="font-data text-xs text-[var(--muted)]">
                    {new Date(lead.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {recentLeads?.length === 0 && (
                <p className="text-[var(--muted)]">No leads received yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Aircall -- direct credential entry, no OAuth needed */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.aircall}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[aircall?.status ?? "not_connected"]}`}
            >
              {aircall?.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          {aircall?.status === "connected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--ink)]">
                API ID <span className="font-data">{aircallConfig.api_id}</span>,
                calling from number{" "}
                <span className="font-data">{aircallConfig.number_id}</span>
              </p>
              <p className="text-xs text-[var(--muted)]">
                Each doctor also needs their Aircall user ID set on the{" "}
                <Link href="/admin/doctors" className="underline">
                  Doctors
                </Link>{" "}
                page before their Call button will work.
              </p>
              <form action={disconnectAircall}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectAircall} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input
                name="api_id"
                type="text"
                placeholder="API ID"
                required
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
              <input
                name="api_token"
                type="password"
                placeholder="API token"
                required
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
              <input
                name="number_id"
                type="number"
                placeholder="Number ID"
                required
                className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)] sm:col-span-3"
              >
                Connect Aircall
              </button>
            </form>
          )}
        </div>

        {/* Dentally -- direct credential entry; header format unconfirmed
            in their public docs, so we ask for the whole header value
            rather than assuming Bearer vs another scheme */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.dentally}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[dentally?.status ?? "not_connected"]}`}
            >
              {dentally?.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Sends a patient&apos;s name and contact details to Dentally as a
            patient record when a doctor is ready to book them in. It
            doesn&apos;t book the appointment slot itself -- that still
            happens inside Dentally.
          </p>

          {dentally?.status === "connected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--ink)]">
                Default payment plan ID:{" "}
                <span className="font-data">
                  {dentallyConfig.default_payment_plan_id || "not set"}
                </span>
              </p>
              <form action={disconnectDentally}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectDentally} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Authorization header value
                </label>
                <input
                  name="auth_header"
                  type="password"
                  placeholder="Whatever Dentally support gave you, e.g. Bearer xxxxx"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Default payment plan ID
                </label>
                <input
                  name="default_payment_plan_id"
                  type="text"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
              >
                Connect Dentally
              </button>
            </form>
          )}
        </div>

        {/* Email -- connects a real mailbox via SMTP, not a transactional
            API, since a small clinic is more likely to already have a
            Gmail/Outlook account than a Resend/Postmark account */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.email}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[email?.status ?? "not_connected"]}`}
            >
              {email?.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Connects a real mailbox (Gmail, Outlook, or any provider) so
            emails sent from a patient&apos;s message thread go out from that
            account. Most providers require an &quot;app password&quot;
            rather than the account&apos;s normal login password for this.
          </p>

          {email?.status === "connected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--ink)]">
                Sending as{" "}
                <span className="font-medium">
                  {emailConfig.from_name} &lt;{emailConfig.from_address}&gt;
                </span>{" "}
                via <span className="font-data">{emailConfig.host}</span>
              </p>
              <form action={disconnectEmail}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectEmail} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  SMTP host
                </label>
                <input
                  name="host"
                  type="text"
                  placeholder="smtp.gmail.com"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Port
                </label>
                <input
                  name="port"
                  type="number"
                  placeholder="587"
                  defaultValue={587}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <input type="checkbox" name="secure" className="accent-[var(--teal)]" />
                  Use SSL (usually only for port 465 -- leave off for 587)
                </label>
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Email address
                </label>
                <input
                  name="username"
                  type="email"
                  placeholder="reception@yourclinic.co.uk"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  App password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Display name
                </label>
                <input
                  name="from_name"
                  type="text"
                  placeholder="Fernwell Dental"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  From address
                </label>
                <input
                  name="from_address"
                  type="email"
                  placeholder="Same as email address above"
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)] sm:col-span-2"
              >
                Connect and send a test email
              </button>
            </form>
          )}
        </div>

        {/* WhatsApp -- sends and receives. Incoming messages are verified
            with the Meta app credentials saved in the Meta card above. */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.whatsapp}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[whatsapp?.status ?? "not_connected"]}`}
            >
              {whatsapp?.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Doctors can message patients on WhatsApp from the portal, and
            their replies come back into the thread. WhatsApp only allows
            free-text replies within 24 hours of the patient&apos;s last
            message.
          </p>

          {whatsapp?.status === "connected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--ink)]">
                Sending as{" "}
                <span className="font-medium">
                  {whatsappConfig.verified_name || "your WhatsApp number"}
                </span>{" "}
                <span className="font-data text-xs text-[var(--muted)]">
                  {whatsappConfig.display_phone_number}
                </span>
              </p>
              <form action={disconnectWhatsApp}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectWhatsApp} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Phone number ID
                </label>
                <input
                  name="phone_number_id"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Permanent access token
                </label>
                <input
                  name="access_token"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)] sm:col-span-2"
              >
                Connect WhatsApp
              </button>
            </form>
          )}

          <MessagingWebhookHelp metaApp={metaApp} product="WhatsApp Business Account" />
        </div>

        {/* Instagram -- sends and receives, replying only to people who
            have messaged the account first (Instagram's rule). */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              {PROVIDER_LABEL.instagram}
            </h2>
            <span
              className={`text-xs font-medium ${STATUS_STYLE[instagram?.status ?? "not_connected"]}`}
            >
              {instagram?.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--muted)]">
            Direct messages come into the portal, and doctors can reply.
            Instagram only allows replying to someone who messaged you first,
            within 24 hours. People who message become new leads
            automatically.
          </p>

          {instagram?.status === "connected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[var(--ink)]">
                Connected as{" "}
                <span className="font-medium">@{instagramConfig.username}</span>
              </p>
              <form action={disconnectInstagram}>
                <button
                  type="submit"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
                >
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectInstagram} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-[var(--muted)]">
                  Instagram access token
                </label>
                <input
                  name="access_token"
                  type="password"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--teal-deep)]"
              >
                Connect Instagram
              </button>
            </form>
          )}

          <MessagingWebhookHelp metaApp={metaApp} product="Instagram" />
        </div>
      </div>
    </div>
  );
}
