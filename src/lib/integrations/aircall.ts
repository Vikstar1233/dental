import "server-only";

// https://developer.aircall.io -- Basic Auth (api_id:api_token).
function authHeader(apiId: string, apiToken: string) {
  return `Basic ${Buffer.from(`${apiId}:${apiToken}`).toString("base64")}`;
}

// Retrieving the chosen number proves in one call that the API ID/token
// are valid AND that the number ID exists on this account.
export async function testAircallConnection({
  apiId,
  apiToken,
  numberId,
}: {
  apiId: string;
  apiToken: string;
  numberId: number;
}) {
  const res = await fetch(`https://api.aircall.io/v1/numbers/${numberId}`, {
    headers: { Authorization: authHeader(apiId, apiToken) },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Aircall rejected that API ID and token.");
  }
  if (res.status === 404) {
    throw new Error("Aircall couldn't find that number ID on this account.");
  }
  if (!res.ok) {
    throw new Error(`Aircall returned an error (${res.status}).`);
  }
}

// POST /v1/users/:id/calls, 204 on success.
export async function dialViaAircall({
  apiId,
  apiToken,
  aircallUserId,
  numberId,
  to,
}: {
  apiId: string;
  apiToken: string;
  aircallUserId: string;
  numberId: number;
  to: string;
}) {
  const res = await fetch(`https://api.aircall.io/v1/users/${aircallUserId}/calls`, {
    method: "POST",
    headers: {
      Authorization: authHeader(apiId, apiToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ number_id: numberId, to }),
  });

  if (!res.ok) {
    throw new Error(`Aircall dial failed: ${await res.text()}`);
  }
}
