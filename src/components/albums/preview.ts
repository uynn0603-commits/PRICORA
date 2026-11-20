import { photoSrc } from "@/lib/media";
import { galleryPath } from "@/lib/store";
import type { Album } from "@/lib/types";

// Previews use the album's own photos once it has any; until then the sample album
// for each template stands in.
export function previewSrc(album: Album | null | undefined, templateId: string): string {
  const hasPhotos = album?.photos.some((photo) => photoSrc(photo));
  return album && hasPhotos ? `${galleryPath(album)}?template=${templateId}&embed=1` : `/templates/${templateId}/demo?embed=1`;
}
