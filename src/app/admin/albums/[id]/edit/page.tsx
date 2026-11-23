"use client";

import { useParams } from "next/navigation";
import { AlbumForm } from "@/components/albums/AlbumForm";

export default function EditAlbumPage() {
  const { id } = useParams<{ id: string }>();
  return <AlbumForm albumId={id} />;
}
