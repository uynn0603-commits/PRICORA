"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { InvitationView } from "@/components/invitations/InvitationView";
import { TraditionalForm } from "@/components/invitations/TraditionalForm";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { copyText } from "@/lib/clipboard";
import { applyTraditionalMirror, contentFromLegacy, contentPhotoIds, emptyContent, fieldErrors, isBlankContent, normalizeContent, TRADITIONAL_TEMPLATE_ID, type InvitationDraft } from "@/lib/invitation-content";
import { photoSrc } from "@/lib/media";
import { toast } from "@/lib/overlay";
import { INVITATION_TEMPLATES } from "@/lib/invitation-catalog";
import { currentStudio, getAlbum, getAlbums, getPlan, invitationList, invitationUrl, invitationsLoaded, loadInvitations, saveInvitation } from "@/lib/store";
import type { InvitationStatus } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const EMPTY: InvitationDraft = {
  albumId: "",
  status: "draft",
  templateId: TRADITIONAL_TEMPLATE_ID,
  groomName: "",
  brideName: "",
  groomParents: "",
  brideParents: "",
  weddingDate: "",
  weddingTime: "",
  venue: "",
  address: "",
  mapUrl: "",
  message: "Trân trọng kính mời bạn đến chung vui cùng gia đình chúng tôi trong ngày thành hôn.",
  thankYou: "Sự hiện diện của bạn là món quà ý nghĩa nhất đối với chúng tôi.",
  musicUrl: "",
  photoIds: [],
  content: emptyContent(),
};

function splitCouple(value: string): [string, string] {
  const parts = value.split(/\s+(?:&|và)\s+/i);
  return parts.length === 2 ? [parts[0].trim(), parts[1].trim()] : ["", ""];
}

function InvitationPreviewModal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="invitation-preview-title" className="flex h-[100dvh] w-full max-w-[640px] flex-col overflow-hidden bg-white shadow-2xl sm:h-[min(920px,92dvh)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <h2 id="invitation-preview-title" className="text-sm font-semibold">
            Xem trước thiết kế
          </h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-mist hover:bg-canvas" aria-label="Đóng xem trước">
            <Icon name="x" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export default function InvitationEditorPage() {
  useStore();
  const { id } = useParams<{ id: string }>();
  const creating = id === "new";
  const router = useRouter();
  const presetAlbum = useSearchParams().get("album") || "";
  const [form, setForm] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadInvitations().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (creating) {
      const album = getAlbum(presetAlbum);
      const [groom, bride] = splitCouple(album?.customerName || "");
      setForm({ ...EMPTY, albumId: album?.id || "", groomName: groom, brideName: bride, weddingDate: album?.shootingDate || "" });
      return;
    }
    const saved = invitationList().find((item) => item.id === id);
    if (!saved) return setMissing(true);
    const loaded: InvitationDraft = {
      albumId: saved.albumId,
      status: saved.status,
      templateId: saved.templateId || "classic",
      groomName: saved.groomName,
      brideName: saved.brideName,
      groomParents: saved.groomParents,
      brideParents: saved.brideParents,
      weddingDate: saved.weddingDate,
      weddingTime: saved.weddingTime,
      venue: saved.venue,
      address: saved.address,
      mapUrl: saved.mapUrl,
      message: saved.message,
      thankYou: saved.thankYou,
      musicUrl: saved.musicUrl,
      photoIds: saved.photoIds,
      content: normalizeContent(saved.content),
    };
    if (loaded.templateId === TRADITIONAL_TEMPLATE_ID && isBlankContent(loaded.content)) loaded.content = contentFromLegacy(loaded);
    setForm(loaded);
  }, [ready, creating, id, presetAlbum]);

  useTitle(`${creating ? "Tạo thiệp" : "Sửa thiệp"} · PICORA`);
  if (!ready || !invitationsLoaded()) return null;
  if (missing) {
    return (
      <div className={`${ui.card} px-6 py-16 text-center`}>
        <p className="font-semibold">Không tìm thấy thiệp</p>
        <Link href="/admin/invitations" className={`${ui.secondary} mt-5`}>
          Về danh sách
        </Link>
      </div>
    );
  }

  const albums = getAlbums();
  const album = form.albumId ? getAlbum(form.albumId) : null;
  const photos = album?.photos || [];
  const traditional = form.templateId === TRADITIONAL_TEMPLATE_ID;
  const chosenIds = traditional ? contentPhotoIds(form.content) : form.photoIds;
  const chosen = chosenIds.flatMap((photoId) => {
    const photo = photos.find((item) => item.id === photoId);
    return photo ? [photo] : [];
  });
  const plan = getPlan();
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const togglePhoto = (photoId: string) => {
    setForm((current) => {
      const has = current.photoIds.includes(photoId);
      if (has) return { ...current, photoIds: current.photoIds.filter((item) => item !== photoId) };
      if (current.photoIds.length >= 12) {
        toast("Một thiệp chọn tối đa 12 ảnh.", "error");
        return current;
      }
      return { ...current, photoIds: [...current.photoIds, photoId] };
    });
  };

  const persist = async (status: InvitationStatus) => {
    const next = applyTraditionalMirror({ ...form, status });
    const found = fieldErrors(next, traditional ? new Set(photos.map((photo) => photo.id)) : null);
    setErrors(found);
    if (Object.keys(found).length) return toast(Object.values(found)[0], "error");
    setForm(next);
    setBusy(true);
    const result = await saveInvitation(creating ? null : id, next);
    setBusy(false);
    if (!result.ok) return toast(result.error, "error");
    toast(status === "draft" ? "Đã lưu bản nháp" : creating ? "Đã xuất bản thiệp" : "Đã lưu thiệp");
    if (creating) router.replace(`/admin/invitations/${result.id}`);
  };

  const saved = creating ? null : invitationList().find((item) => item.id === id) || null;

  return (
    <>
      <PageHeader
        title={creating ? "Tạo thiệp" : `${form.groomName} & ${form.brideName}`}
        description={plan.invitations != null ? `Gói ${plan.name} tạo được ${plan.invitations} thiệp.` : "Thiệp dùng ảnh sẵn có của album, không tốn thêm dung lượng."}
        actions={
          saved?.status === "published" ? (
            <>
              <button
                type="button"
                className={ui.secondary}
                onClick={() => {
                  void copyText(invitationUrl(saved)).then((ok) => toast(ok ? "Đã sao chép liên kết" : "Không sao chép được.", ok ? undefined : "error"));
                }}
              >
                <Icon name="link" className="h-4 w-4" /> Sao chép link
              </button>
              <Link href={invitationUrl(saved).replace(location.origin, "")} target="_blank" className={ui.secondary}>
                <Icon name="external-link" className="h-4 w-4" /> Mở thiệp
              </Link>
            </>
          ) : null
        }
      />
      <form onSubmit={(event) => event.preventDefault()} className={`grid gap-4 ${traditional ? "xl:grid-cols-[minmax(0,1fr)_400px]" : "lg:grid-cols-5"}`}>
        <div className={`space-y-4 ${traditional ? "" : "lg:col-span-3"}`}>
          <section className={`${ui.card} space-y-4 p-5`}>
            <fieldset>
              <legend className={ui.label}>Mẫu thiệp</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {INVITATION_TEMPLATES.map((meta) => {
                  const selected = form.templateId === meta.id;
                  return (
                    <button
                      key={meta.id}
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setForm((current) => {
                          const next = { ...current, templateId: meta.id };
                          if (meta.id === TRADITIONAL_TEMPLATE_ID && isBlankContent(current.content)) next.content = contentFromLegacy(current);
                          return applyTraditionalMirror(next);
                        });
                      }}
                      aria-pressed={selected}
                      className={`rounded-2xl border p-3 text-left transition ${selected ? "border-[#8C1D2C] ring-2 ring-[#8C1D2C]/20" : "border-line hover:border-[#8C1D2C]/40"}`}
                    >
                      <span className="block h-12 rounded-xl" style={{ background: `linear-gradient(135deg, ${meta.swatch.bg}, ${meta.swatch.accent})` }} />
                      <span className="mt-3 block text-sm font-semibold text-ink">{meta.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-mist">{meta.tagline}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {traditional ? null : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="groom" label="Chú rể" required value={form.groomName} error={errors.groomName} onChange={(event) => set("groomName", event.target.value)} />
                  <TextField id="bride" label="Cô dâu" required value={form.brideName} error={errors.brideName} onChange={(event) => set("brideName", event.target.value)} />
                  <TextField id="groom-parents" label="Nhà trai" value={form.groomParents} onChange={(event) => set("groomParents", event.target.value)} hint="Ông bà thông gia nhà trai" />
                  <TextField id="bride-parents" label="Nhà gái" value={form.brideParents} onChange={(event) => set("brideParents", event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField id="date" label="Ngày cưới" type="date" value={form.weddingDate} error={errors.weddingDate} onChange={(event) => set("weddingDate", event.target.value)} />
                  <TextField id="time" label="Giờ" value={form.weddingTime} placeholder="17:00" onChange={(event) => set("weddingTime", event.target.value)} />
                </div>
                <TextField id="venue" label="Địa điểm" value={form.venue} onChange={(event) => set("venue", event.target.value)} />
                <TextField id="address" label="Địa chỉ" value={form.address} onChange={(event) => set("address", event.target.value)} />
                <TextField id="map" label="Liên kết bản đồ" value={form.mapUrl} error={errors.mapUrl} placeholder="https://maps.google.com/..." onChange={(event) => set("mapUrl", event.target.value)} />
                <TextArea id="message" label="Lời mời" rows={3} value={form.message} onChange={(event) => set("message", event.target.value)} />
                <TextArea id="thanks" label="Lời cảm ơn" rows={2} value={form.thankYou} onChange={(event) => set("thankYou", event.target.value)} />
                <TextField id="music" label="Nhạc nền" value={form.musicUrl} error={errors.musicUrl} placeholder="https://.../bai-hat.mp3" hint="Liên kết https tới file nhạc. Khách bấm nút để nghe." onChange={(event) => set("musicUrl", event.target.value)} />
              </>
            )}
          </section>
          {traditional ? (
            <TraditionalForm draft={form} albums={albums} photos={photos} errors={errors} onChange={(next) => { setErrors({}); setForm(next); }} />
          ) : (
            <section className={`${ui.card} space-y-4 p-5`}>
              <SelectField
                id="album"
                label="Album ảnh"
                value={form.albumId}
                options={[{ value: "", label: "Không dùng album" }, ...albums.map((item) => ({ value: item.id, label: item.name }))]}
                onChange={(event) => setForm((current) => ({ ...current, albumId: event.target.value, photoIds: [] }))}
              />
              {photos.length ? (
                <>
                  <p className="text-sm text-mist">
                    {form.templateId === "golden-letter"
                      ? "Chọn tối đa 12 ảnh. Ảnh đầu mở đầu bức thư, các ảnh sau nằm trong tuyển tập."
                      : "Chọn tối đa 12 ảnh. Ảnh đầu là ảnh bìa, ảnh thứ hai là ảnh cặp đôi, các ảnh sau xếp bên dưới lịch."}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((photo) => {
                      const order = form.photoIds.indexOf(photo.id);
                      return (
                        <button key={photo.id} type="button" onClick={() => togglePhoto(photo.id)} className={`relative aspect-[3/4] overflow-hidden rounded-xl border ${order >= 0 ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoSrc(photo, 400)} alt={photo.name} className="h-full w-full object-cover" />
                          {order >= 0 ? <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{order + 1}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-mist">{form.albumId ? "Album này chưa có ảnh." : "Chọn album để lấy ảnh cho thiệp."}</p>
              )}
            </section>
          )}
        </div>
        <aside className={`space-y-4 ${traditional ? "xl:sticky xl:top-4 xl:self-start" : "lg:col-span-2"}`}>
          <section className={`${ui.card} space-y-3 p-5`}>
            <p className="text-sm text-mist">Khách chỉ mở được thiệp sau khi xuất bản. Bản nháp giữ lại để sửa tiếp.</p>
            <button type="button" disabled={busy} onClick={() => void persist("draft")} className={`${ui.secondary} w-full`}>
              Lưu nháp
            </button>
            <button type="button" disabled={busy} onClick={() => void persist("published")} className={`${ui.primary} w-full`}>
              {busy ? "Đang lưu..." : "Xuất bản"}
            </button>
            <button type="button" onClick={() => setPreview(true)} className={`${ui.secondary} w-full ${traditional ? "xl:hidden" : ""}`}>
              <Icon name="eye" className="h-4 w-4" /> Xem trước
            </button>
          </section>
          {traditional ? (
            <div className="hidden max-h-[calc(100vh-15rem)] overflow-y-auto rounded-2xl border border-line xl:block">
              <InvitationView invitation={{ ...form, id, studioId: "", slug: saved?.slug || "", createdAt: "", updatedAt: "" }} studioName={currentStudio()?.name || ""} photos={chosen} shareUrl={saved ? invitationUrl(saved) : ""} showBrand={plan.id === "free"} preview />
            </div>
          ) : null}
        </aside>
      </form>
      {preview ? (
        <InvitationPreviewModal onClose={() => setPreview(false)}>
          <InvitationView invitation={{ ...form, id, studioId: "", slug: saved?.slug || "", createdAt: "", updatedAt: "" }} studioName={currentStudio()?.name || ""} photos={chosen} shareUrl={saved ? invitationUrl(saved) : ""} showBrand={plan.id === "free"} preview />
        </InvitationPreviewModal>
      ) : null}
    </>
  );
}
