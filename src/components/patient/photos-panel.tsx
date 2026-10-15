import { uploadPhoto } from "@/lib/actions/patients";

type Photo = { id: string; storage_path: string; caption: string };

export function PhotosPanel({
  patientId,
  photos,
  photoUrls,
  redirectTo,
}: {
  patientId: string;
  photos: Photo[];
  photoUrls: Map<string, string>;
  redirectTo: string;
}) {
  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => {
            const url = photoUrls.get(photo.storage_path);
            if (!url) return null;
            return (
              <div key={photo.id} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={photo.caption}
                  className="aspect-square w-full rounded-lg border border-[var(--line)] object-cover"
                />
                {photo.caption && (
                  <p className="truncate text-xs text-[var(--muted)]">
                    {photo.caption}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {photos.length === 0 && (
        <p className="text-sm text-[var(--muted)]">No photos yet.</p>
      )}

      <form action={uploadPhoto} className="space-y-2">
        <input type="hidden" name="patient_id" value={patientId} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input
          name="file"
          type="file"
          accept="image/*"
          required
          className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--teal-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--teal-deep)]"
        />
        <input
          name="caption"
          type="text"
          placeholder="Caption (optional)"
          className="block w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--porcelain)]"
        >
          Upload photo
        </button>
      </form>
    </div>
  );
}
