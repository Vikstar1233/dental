import { sendMessage } from "@/lib/actions/patients";
import { CallButton } from "./call-button";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "call_note", label: "Call note" },
];

type Message = {
  id: string;
  direction: string;
  channel: string;
  body: string;
  status?: string;
  created_at: string;
};

export function MessageThread({
  patientId,
  messages,
  redirectTo,
}: {
  patientId: string;
  messages: Message[];
  redirectTo: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Messages</h2>
        <CallButton patientId={patientId} />
      </div>

      <div className="space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
              message.direction === "inbound"
                ? "border-[var(--line)] bg-[var(--porcelain)]"
                : "border-[var(--teal-soft)] bg-[var(--teal-soft)]/40"
            }`}
          >
            <div className="flex justify-between font-data text-xs text-[var(--muted)]">
              <span className="capitalize">
                {message.channel} · {message.direction}
                {message.status === "failed" && (
                  <span className="ml-2 text-[var(--danger)]">
                    &middot; not delivered
                  </span>
                )}
              </span>
              <span>{new Date(message.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-[var(--ink)]">{message.body}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No messages yet.</p>
        )}
      </div>

      <form action={sendMessage} className="space-y-2">
        <input type="hidden" name="patient_id" value={patientId} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <div className="flex gap-2">
          <select
            name="channel"
            defaultValue="whatsapp"
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
          >
            {CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
          <input
            name="body"
            type="text"
            required
            placeholder="Message"
            className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--teal)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--teal-deep)]"
        >
          Send
        </button>
      </form>
    </div>
  );
}
