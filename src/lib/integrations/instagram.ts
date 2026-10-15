import "server-only";

// Instagram API with Instagram Login. A token belongs to one professional
// account, so "me" is that account -- no account ID needs entering.
const IG_URL = "https://graph.instagram.com/v25.0";

type GraphError = { error?: { message?: string; code?: number } };

async function readError(res: Response): Promise<GraphError["error"]> {
  const body = (await res.json().catch(() => null)) as GraphError | null;
  return body?.error;
}

export async function testInstagramConnection(token: string) {
  const res = await fetch(`${IG_URL}/me?fields=username`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await readError(res);
    if (err?.code === 190 || res.status === 401) {
      throw new Error("Instagram rejected that access token.");
    }
    throw new Error(err?.message ?? `Instagram returned an error (${res.status}).`);
  }

  const data = (await res.json()) as { username?: string };
  return { username: data.username ?? "" };
}

// Instagram only allows replying to someone who messaged first, within 24
// hours, and addresses them by an Instagram-scoped ID (never their @handle).
export async function sendInstagramText({
  token,
  recipientId,
  body,
}: {
  token: string;
  recipientId: string;
  body: string;
}): Promise<string> {
  const res = await fetch(`${IG_URL}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: body },
    }),
  });

  if (!res.ok) {
    const err = await readError(res);
    throw new Error(
      err?.message
        ? `Instagram couldn't deliver it: ${err.message}`
        : `Instagram returned an error (${res.status}).`,
    );
  }

  const data = (await res.json()) as { message_id?: string };
  return data.message_id ?? "";
}

// Best effort -- used only to give a brand-new contact a real name.
export async function fetchInstagramName(token: string, igsid: string) {
  try {
    const res = await fetch(`${IG_URL}/${igsid}?fields=name,username`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { name?: string; username?: string };
    return data.name || data.username;
  } catch {
    return undefined;
  }
}
