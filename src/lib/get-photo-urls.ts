import "server-only";
import { createClient } from "@/lib/supabase/server";

// Bucket is private, so photos are only ever displayed via short-lived
// signed URLs generated here -- and this call itself is subject to the
// same storage RLS policies as everything else, so a doctor can't get a
// signed URL for a photo on a patient that isn't theirs.
export async function getPhotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length === 0) return new Map<string, string>();

  const { data } = await supabase.storage
    .from("patient-photos")
    .createSignedUrls(paths, 60 * 10);

  const map = new Map<string, string>();
  data?.forEach((entry) => {
    if (entry.path && entry.signedUrl) {
      map.set(entry.path, entry.signedUrl);
    }
  });
  return map;
}
