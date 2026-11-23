"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { findLegacyAlbum } from "@/lib/store";

// Links from before studios existed were /gallery/:slug.
export default function LegacyGalleryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    void findLegacyAlbum(slug).then((path) => router.replace(path ? `${path}${location.search}` : `/s/-/${slug}`));
  }, [slug, router]);

  return null;
}
