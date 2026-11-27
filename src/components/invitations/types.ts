import type { Invitation, Photo } from "@/lib/types";

export interface InvitationViewProps {
  invitation: Invitation;
  studioName: string;
  photos: Photo[];
  shareUrl: string;
  showBrand: boolean;
  preview?: boolean;
}
