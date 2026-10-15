// Netlify scheduled function: every 10 minutes it pokes the portal's
// campaign runner, which sends whatever follow-ups are due. Netlify
// provides URL (the site's address) automatically.
export default async function handler() {
  const base = process.env.URL;
  if (!base) return;

  const headers: Record<string, string> = {};
  if (process.env.CRON_SECRET) {
    headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
  }

  const response = await fetch(`${base}/api/cron/campaigns`, { method: "POST", headers });
  console.log("Campaign run:", response.status);
}

export const config = {
  schedule: "*/10 * * * *",
};
