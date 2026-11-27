"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { copyText } from "@/lib/clipboard";
import { formatDate } from "@/lib/format";
import { confirmDialog, toast } from "@/lib/overlay";
import { getInvitationTemplate } from "@/lib/invitation-catalog";
import { deleteInvitation, getAlbum, invitationList, invitationUrl, invitationsLoaded, loadInvitations } from "@/lib/store";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

export default function InvitationsPage() {
  useStore();
  useTitle("Thiệp cưới · PICORA");

  useEffect(() => {
    void loadInvitations();
  }, []);

  if (!invitationsLoaded()) return null;
  const rows = invitationList();

  const remove = async (id: string, title: string) => {
    const ok = await confirmDialog({
      title: `Xóa thiệp ${title}?`,
      message: "Liên kết đã gửi cho khách sẽ không mở được nữa.",
      confirmText: "Xóa thiệp",
      danger: true,
    });
    if (!ok) return;
    const result = await deleteInvitation(id);
    toast(result.ok ? "Đã xóa thiệp" : result.error, result.ok ? undefined : "error");
  };

  return (
    <>
      <PageHeader
        title="Thiệp cưới"
        description="Tạo trang thiệp từ ảnh của album và gửi link cho khách mời."
        actions={
          <Link href="/admin/invitations/new" className={ui.primary}>
            <Icon name="plus" className="h-4 w-4" /> Tạo thiệp
          </Link>
        }
      />
      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => {
            const title = `${item.groomName} & ${item.brideName}`;
            const album = item.albumId ? getAlbum(item.albumId) : null;
            return (
              <article key={item.id} className={`${ui.card} flex flex-col p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-playfair text-2xl">{title}</h2>
                    <p className="mt-1 text-sm text-mist">{item.weddingDate ? formatDate(item.weddingDate) : "Chưa có ngày"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-canvas text-mist"}`}>
                    {item.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </div>
                <p className="mt-3 truncate text-sm text-mist">{getInvitationTemplate(item.templateId).name}</p>
                <p className="mt-1 truncate text-sm text-mist">{album ? album.name : "Không gắn album"}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/admin/invitations/${item.id}`} className={ui.secondary}>
                    <Icon name="pencil" className="h-4 w-4" /> Sửa
                  </Link>
                  {item.status === "published" ? (
                    <button
                      type="button"
                      className={ui.secondary}
                      onClick={() => {
                        void copyText(invitationUrl(item)).then((ok) => toast(ok ? "Đã sao chép liên kết" : "Không sao chép được.", ok ? undefined : "error"));
                      }}
                    >
                      <Icon name="link" className="h-4 w-4" /> Sao chép link
                    </button>
                  ) : null}
                  <button type="button" className={ui.ghost} onClick={() => void remove(item.id, title)}>
                    <Icon name="trash-2" className="h-4 w-4" /> Xóa
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={`${ui.card} px-6 py-16 text-center`}>
          <p className="font-semibold">Chưa có thiệp nào</p>
          <p className="mt-1 text-sm text-mist">Chọn một album cưới, điền tên cô dâu chú rể và gửi link cho khách.</p>
          <Link href="/admin/invitations/new" className={`${ui.primary} mt-5`}>
            <Icon name="plus" className="h-4 w-4" /> Tạo thiệp đầu tiên
          </Link>
        </div>
      )}
    </>
  );
}
