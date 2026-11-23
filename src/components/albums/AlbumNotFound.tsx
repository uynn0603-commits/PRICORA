import Link from "next/link";
import { cn } from "@/lib/format";
import { ui } from "@/lib/ui";

export function AlbumNotFound() {
  return (
    <div className={cn(ui.card, "p-8")}>
      <h1 className="text-xl font-semibold">Không tìm thấy album</h1>
      <Link href="/admin/albums" className={cn(ui.secondary, "mt-4")}>
        Quay lại danh sách album
      </Link>
    </div>
  );
}
