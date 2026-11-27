"use client";

import { useEffect, useState } from "react";
import { FieldError, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { photoSrc } from "@/lib/media";
import {
  applyTraditionalMirror,
  emptyEvent,
  emptyPlace,
  EVENT_TYPES,
  groupFill,
  groupForError,
  LIMITS,
  moveItem,
  newItemId,
  PHOTO_KINDS,
  type GroupId,
  type InvitationContent,
  type InvitationDraft,
  type InvitationPhoto,
  type WeddingEvent,
} from "@/lib/invitation-content";
import type { Album, Photo } from "@/lib/types";
import { ui } from "@/lib/ui";

const GROUPS: Array<{ id: GroupId; title: string; hint: string; required?: boolean }> = [
  { id: "general", title: "Thông tin chung", hint: "Tiêu đề, cô dâu chú rể, ngày cưới và ảnh bìa.", required: true },
  { id: "bride", title: "Nhà gái", hint: "Để trống thì thiệp không hiện mục nhà gái." },
  { id: "groom", title: "Nhà trai", hint: "Để trống thì thiệp không hiện mục nhà trai." },
  { id: "events", title: "Lễ cưới", hint: "Thêm từng sự kiện. Có thể sắp xếp thứ tự." },
  { id: "letter", title: "Lời mời", hint: "Nội dung nhiều dòng. Mục nào trống sẽ không hiện." },
  { id: "photos", title: "Ảnh cưới", hint: "Chọn từ album, kéo thả để sắp xếp. Thiệp dùng ảnh đã thu nhỏ." },
  { id: "calendar", title: "Lịch và đếm ngược", hint: "Lịch đánh dấu đúng ngày cưới. Giờ đếm lấy từ sự kiện trong ngày." },
  { id: "maps", title: "Bản đồ", hint: "Nếu để trống, thiệp dùng địa điểm của các sự kiện." },
];

function Badge({ fill, required }: { fill: ReturnType<typeof groupFill>; required?: boolean }) {
  if (fill === "ready") return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{required ? "Đã đủ" : "Đã nhập"}</span>;
  if (fill === "partial") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Còn thiếu</span>;
  return <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-mist">{required ? "Chưa nhập" : "Không hiện"}</span>;
}

function PhotoChoices({ photos, value, onPick }: { photos: Photo[]; value: string; onPick: (id: string) => void }) {
  if (!photos.length) return <p className="text-sm text-mist">Album này chưa có ảnh.</p>;
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {photos.map((photo) => {
        const selected = photo.id === value;
        return (
          <button key={photo.id} type="button" onClick={() => onPick(selected ? "" : photo.id)} className={`relative aspect-[3/4] overflow-hidden rounded-lg border ${selected ? "border-[#8C1D2C] ring-2 ring-[#8C1D2C]/30" : "border-line"}`} aria-pressed={selected}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc(photo, 400)} alt={photo.name} className="h-full w-full object-cover object-[center_20%]" />
          </button>
        );
      })}
    </div>
  );
}

function clearImages(content: InvitationContent): InvitationContent {
  return {
    ...content,
    coverImageId: "",
    studioLogoId: "",
    brideFamily: { ...content.brideFamily, familyImageId: "" },
    groomFamily: { ...content.groomFamily, familyImageId: "" },
    events: content.events.map((event) => ({ ...event, imageId: "" })),
    places: content.places.map((place) => ({ ...place, imageId: "" })),
    photos: [],
  };
}

export function TraditionalForm({ draft, albums, photos, errors, onChange }: { draft: InvitationDraft; albums: Album[]; photos: Photo[]; errors: Record<string, string>; onChange: (next: InvitationDraft) => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ general: true });
  const content = draft.content;

  useEffect(() => {
    const key = Object.keys(errors)[0];
    if (!key) return;
    const group = groupForError(key);
    setOpen((current) => ({ ...current, [group]: true }));
  }, [errors]);

  const commit = (next: InvitationDraft) => onChange(applyTraditionalMirror(next));
  const setContent = (next: InvitationContent) => commit({ ...draft, content: next });
  const patch = (partial: Partial<InvitationDraft>) => commit({ ...draft, ...partial });

  const setFamily = (side: "brideFamily" | "groomFamily", key: keyof InvitationContent["brideFamily"], value: string) => {
    setContent({ ...content, [side]: { ...content[side], [key]: value } });
  };

  const setEvent = (index: number, partial: Partial<WeddingEvent>) => {
    const events = content.events.map((event, eventIndex) => (eventIndex === index ? { ...event, ...partial } : event));
    setContent({ ...content, events });
  };

  const setPhoto = (index: number, partial: Partial<InvitationPhoto>) => {
    const next = content.photos.map((photo, photoIndex) => (photoIndex === index ? { ...photo, ...partial } : photo));
    if (partial.kind === "cover") {
      next.forEach((photo, photoIndex) => {
        if (photoIndex !== index && photo.kind === "cover") photo.kind = "gallery";
      });
      setContent({ ...content, coverImageId: next[index].photoId, photos: next });
      return;
    }
    setContent({ ...content, photos: next });
  };

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const expanded = open[group.id] ?? false;
        return (
          <section key={group.id} className={ui.card}>
            <button type="button" className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={expanded} onClick={() => setOpen((current) => ({ ...current, [group.id]: !expanded }))}>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {group.title}
                  {group.required ? <span className="text-primary"> *</span> : null}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-mist">{group.hint}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge fill={groupFill(group.id, draft)} required={group.required} />
                <Icon name="chevron-down" className={`h-4 w-4 text-mist transition ${expanded ? "rotate-180" : ""}`} />
              </span>
            </button>
            {expanded ? (
              <div className="space-y-4 border-t border-line px-5 py-5">
                {group.id === "general" ? (
                  <>
                    <SelectField id="album" label="Album ảnh" value={draft.albumId} error={errors.albumId} options={[{ value: "", label: "Chọn album" }, ...albums.map((item) => ({ value: item.id, label: item.name }))]} onChange={(event) => commit({ ...draft, albumId: event.target.value, photoIds: [], content: clearImages(content) })} />
                    <TextField id="title" label="Tiêu đề thiệp" required value={content.invitationTitle} error={errors.invitationTitle} onChange={(event) => setContent({ ...content, invitationTitle: event.target.value })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField id="groom" label="Họ tên chú rể" required value={draft.groomName} error={errors.groomName} onChange={(event) => patch({ groomName: event.target.value })} />
                      <TextField id="bride" label="Họ tên cô dâu" required value={draft.brideName} error={errors.brideName} onChange={(event) => patch({ brideName: event.target.value })} />
                    </div>
                    <TextField id="date" label="Ngày cưới" required type="date" value={draft.weddingDate} error={errors.weddingDate} onChange={(event) => patch({ weddingDate: event.target.value })} />
                    <div>
                      <p className={ui.label}>
                        Ảnh bìa <span className="text-primary">*</span>
                      </p>
                      <PhotoChoices photos={photos} value={content.coverImageId} onPick={(id) => setContent({ ...content, coverImageId: id })} />
                      <FieldError message={errors.coverImageId} />
                    </div>
                    <TextArea id="intro" label="Lời giới thiệu" rows={4} value={content.introduction} onChange={(event) => setContent({ ...content, introduction: event.target.value })} />
                    <div>
                      <p className={ui.label}>Logo studio</p>
                      <PhotoChoices photos={photos} value={content.studioLogoId} onPick={(id) => setContent({ ...content, studioLogoId: id })} />
                    </div>
                    <TextField id="music" label="Nhạc nền" value={draft.musicUrl} error={errors.musicUrl} placeholder="https://.../bai-hat.mp3" hint="Liên kết https. Khách bấm nút để nghe." onChange={(event) => patch({ musicUrl: event.target.value })} />
                  </>
                ) : null}
                {group.id === "bride" ? (
                  <FamilyFields prefix="bride" side={content.brideFamily} photos={photos} onChange={(key, value) => setFamily("brideFamily", key, value)} />
                ) : null}
                {group.id === "groom" ? (
                  <FamilyFields prefix="groom" side={content.groomFamily} photos={photos} onChange={(key, value) => setFamily("groomFamily", key, value)} />
                ) : null}
                {group.id === "events" ? (
                  <>
                    {content.events.map((event, index) => (
                      <article
                        key={event.id}
                        className="space-y-3 rounded-xl border border-line p-4"
                        draggable
                        onDragStart={(drag) => drag.dataTransfer.setData("text/plain", `event:${index}`)}
                        onDragOver={(drag) => drag.preventDefault()}
                        onDrop={(drag) => {
                          const raw = drag.dataTransfer.getData("text/plain");
                          if (!raw.startsWith("event:")) return;
                          const from = Number(raw.slice(6));
                          if (Number.isNaN(from) || from === index) return;
                          setContent({ ...content, events: moveItem(content.events, from, index - from) });
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-mist">
                            <Icon name="grip-vertical" className="h-4 w-4" /> Sự kiện {index + 1}
                          </span>
                          <span className="flex gap-1">
                            <button type="button" className={ui.ghost} aria-label="Đưa lên" onClick={() => setContent({ ...content, events: moveItem(content.events, index, -1) })}>
                              <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                            </button>
                            <button type="button" className={ui.ghost} aria-label="Đưa xuống" onClick={() => setContent({ ...content, events: moveItem(content.events, index, 1) })}>
                              <Icon name="chevron-down" className="h-4 w-4" />
                            </button>
                            <button type="button" className={ui.ghost} aria-label="Xóa sự kiện" onClick={() => setContent({ ...content, events: content.events.filter((_, eventIndex) => eventIndex !== index) })}>
                              <Icon name="trash-2" className="h-4 w-4" />
                            </button>
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextField id={`event-name-${event.id}`} label="Tên sự kiện" value={event.name} onChange={(input) => setEvent(index, { name: input.target.value })} />
                          <SelectField id={`event-type-${event.id}`} label="Loại sự kiện" value={event.type} options={EVENT_TYPES.map((item) => ({ value: item.id, label: item.label }))} onChange={(input) => setEvent(index, { type: input.target.value })} />
                          <TextField id={`event-date-${event.id}`} label="Ngày tổ chức" type="date" value={event.date} error={errors[`events.${index}.date`]} onChange={(input) => setEvent(index, { date: input.target.value })} />
                          <TextField id={`event-time-${event.id}`} label="Giờ bắt đầu" type="time" value={event.startTime} error={errors[`events.${index}.startTime`]} onChange={(input) => setEvent(index, { startTime: input.target.value })} />
                        </div>
                        <TextField id={`event-venue-${event.id}`} label="Tên địa điểm" value={event.venueName} onChange={(input) => setEvent(index, { venueName: input.target.value })} />
                        <TextField id={`event-address-${event.id}`} label="Địa chỉ" value={event.venueAddress} onChange={(input) => setEvent(index, { venueAddress: input.target.value })} />
                        <TextField id={`event-map-${event.id}`} label="Link Google Maps" value={event.mapUrl} error={errors[`events.${index}.mapUrl`]} placeholder="https://maps.google.com/..." onChange={(input) => setEvent(index, { mapUrl: input.target.value })} />
                        <div>
                          <p className={ui.label}>Ảnh sự kiện</p>
                          <PhotoChoices photos={photos} value={event.imageId} onPick={(id) => setEvent(index, { imageId: id })} />
                        </div>
                      </article>
                    ))}
                    <button type="button" className={ui.secondary} disabled={content.events.length >= LIMITS.events} onClick={() => setContent({ ...content, events: [...content.events, { ...emptyEvent(), date: draft.weddingDate }] })}>
                      <Icon name="plus" className="h-4 w-4" /> Thêm sự kiện
                    </button>
                  </>
                ) : null}
                {group.id === "letter" ? (
                  <>
                    <TextArea id="letter" label="Nội dung lời mời" rows={5} value={content.invitationMessage} onChange={(event) => setContent({ ...content, invitationMessage: event.target.value })} />
                    <TextField id="from" label="Người gửi lời mời" value={content.invitationFrom} onChange={(event) => setContent({ ...content, invitationFrom: event.target.value })} />
                    <TextArea id="note" label="Ghi chú" rows={3} value={content.invitationNote} onChange={(event) => setContent({ ...content, invitationNote: event.target.value })} />
                    <TextArea id="closing" label="Lời kết" rows={3} value={content.closingMessage} onChange={(event) => setContent({ ...content, closingMessage: event.target.value })} />
                  </>
                ) : null}
                {group.id === "photos" ? (
                  <>
                    <p className="text-sm text-mist">Đã chọn {content.photos.length}/{LIMITS.photos}. Ảnh bìa nằm ở nhóm thông tin chung.</p>
                    <div className="space-y-3">
                      {content.photos.map((item, index) => {
                        const photo = photos.find((entry) => entry.id === item.photoId);
                        if (!photo) return null;
                        return (
                          <article
                            key={item.photoId}
                            className="flex gap-3 rounded-xl border border-line p-3"
                            draggable
                            onDragStart={(drag) => drag.dataTransfer.setData("text/plain", `photo:${index}`)}
                            onDragOver={(drag) => drag.preventDefault()}
                            onDrop={(drag) => {
                              const raw = drag.dataTransfer.getData("text/plain");
                              if (!raw.startsWith("photo:")) return;
                              const from = Number(raw.slice(6));
                              if (Number.isNaN(from) || from === index) return;
                              setContent({ ...content, photos: moveItem(content.photos, from, index - from) });
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoSrc(photo, 400)} alt={item.caption || photo.name} className="h-20 w-16 shrink-0 rounded-lg object-cover object-[center_20%]" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <input className={ui.input} value={item.caption} placeholder="Chú thích" onChange={(event) => setPhoto(index, { caption: event.target.value })} />
                              <div className="flex flex-wrap items-center gap-2">
                                <select className={`${ui.input} h-9 w-auto`} value={item.kind} onChange={(event) => setPhoto(index, { kind: event.target.value })} aria-label="Loại ảnh">
                                  {PHOTO_KINDS.map((kind) => (
                                    <option key={kind.id} value={kind.id}>
                                      {kind.label}
                                    </option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-2 text-xs font-semibold text-ink">
                                  <input type="checkbox" checked={item.visible} onChange={(event) => setPhoto(index, { visible: event.target.checked })} />
                                  Hiện trên thiệp
                                </label>
                              </div>
                            </div>
                            <span className="flex flex-col">
                              <button type="button" className={ui.ghost} aria-label="Đưa lên" onClick={() => setContent({ ...content, photos: moveItem(content.photos, index, -1) })}>
                                <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                              </button>
                              <button type="button" className={ui.ghost} aria-label="Xóa ảnh" onClick={() => setContent({ ...content, photos: content.photos.filter((entry) => entry.photoId !== item.photoId) })}>
                                <Icon name="trash-2" className="h-4 w-4" />
                              </button>
                            </span>
                          </article>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {photos.map((photo) => {
                        const selected = content.photos.some((item) => item.photoId === photo.id);
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setContent({ ...content, photos: content.photos.filter((item) => item.photoId !== photo.id) });
                                return;
                              }
                              if (content.photos.length >= LIMITS.photos) return;
                              setContent({ ...content, photos: [...content.photos, { photoId: photo.id, caption: "", kind: "gallery", visible: true }] });
                            }}
                            className={`relative aspect-[3/4] overflow-hidden rounded-lg border ${selected ? "border-[#8C1D2C] ring-2 ring-[#8C1D2C]/30" : "border-line"}`}
                            aria-pressed={selected}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoSrc(photo, 400)} alt={photo.name} className="h-full w-full object-cover object-[center_20%]" />
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
                {group.id === "calendar" ? (
                  <>
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                      <input type="checkbox" checked={content.countdownEnabled} onChange={(event) => setContent({ ...content, countdownEnabled: event.target.checked })} />
                      Bật đếm ngược
                    </label>
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                      <input type="checkbox" checked={content.calendarEnabled} onChange={(event) => setContent({ ...content, calendarEnabled: event.target.checked })} />
                      Hiển thị lịch tháng
                    </label>
                    <TextField id="highlight" label="Ngày đánh dấu trên lịch" type="date" value={content.calendarHighlightDate} error={errors.calendarHighlightDate} hint={draft.weddingDate ? `Để trống sẽ đánh dấu ngày cưới ${draft.weddingDate}.` : "Để trống sẽ dùng ngày cưới."} onChange={(event) => setContent({ ...content, calendarHighlightDate: event.target.value })} />
                  </>
                ) : null}
                {group.id === "maps" ? (
                  <>
                    {content.places.map((place, index) => (
                      <article key={place.id} className="space-y-3 rounded-xl border border-line p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-mist">Địa điểm {index + 1}</span>
                          <span className="flex gap-1">
                            <button type="button" className={ui.ghost} aria-label="Đưa lên" onClick={() => setContent({ ...content, places: moveItem(content.places, index, -1) })}>
                              <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                            </button>
                            <button type="button" className={ui.ghost} aria-label="Đưa xuống" onClick={() => setContent({ ...content, places: moveItem(content.places, index, 1) })}>
                              <Icon name="chevron-down" className="h-4 w-4" />
                            </button>
                            <button type="button" className={ui.ghost} aria-label="Xóa địa điểm" onClick={() => setContent({ ...content, places: content.places.filter((_, placeIndex) => placeIndex !== index) })}>
                              <Icon name="trash-2" className="h-4 w-4" />
                            </button>
                          </span>
                        </div>
                        <TextField id={`place-name-${place.id}`} label="Tên địa điểm" value={place.name} onChange={(event) => setContent({ ...content, places: content.places.map((item, placeIndex) => (placeIndex === index ? { ...item, name: event.target.value } : item)) })} />
                        <TextField id={`place-address-${place.id}`} label="Địa chỉ" value={place.address} onChange={(event) => setContent({ ...content, places: content.places.map((item, placeIndex) => (placeIndex === index ? { ...item, address: event.target.value } : item)) })} />
                        <TextField id={`place-map-${place.id}`} label="Link Google Maps" value={place.mapUrl} error={errors[`places.${index}.mapUrl`]} placeholder="https://maps.google.com/..." onChange={(event) => setContent({ ...content, places: content.places.map((item, placeIndex) => (placeIndex === index ? { ...item, mapUrl: event.target.value } : item)) })} />
                        <SelectField
                          id={`place-event-${place.id}`}
                          label="Sự kiện liên quan"
                          value={place.eventId}
                          options={[{ value: "", label: "Không gắn sự kiện" }, ...content.events.map((event) => ({ value: event.id, label: event.name || eventTypeName(event.type) }))]}
                          onChange={(event) => setContent({ ...content, places: content.places.map((item, placeIndex) => (placeIndex === index ? { ...item, eventId: event.target.value } : item)) })}
                        />
                        <div>
                          <p className={ui.label}>Ảnh địa điểm</p>
                          <PhotoChoices photos={photos} value={place.imageId} onPick={(id) => setContent({ ...content, places: content.places.map((item, placeIndex) => (placeIndex === index ? { ...item, imageId: id } : item)) })} />
                        </div>
                      </article>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={ui.secondary} disabled={content.places.length >= LIMITS.places} onClick={() => setContent({ ...content, places: [...content.places, emptyPlace()] })}>
                        <Icon name="plus" className="h-4 w-4" /> Thêm địa điểm
                      </button>
                      <button
                        type="button"
                        className={ui.secondary}
                        onClick={() => {
                          const taken = new Set(content.places.map((place) => place.eventId).filter(Boolean));
                          const added = content.events
                            .filter((event) => (event.venueName || event.mapUrl) && !taken.has(event.id))
                            .slice(0, LIMITS.places - content.places.length)
                            .map((event) => ({ id: newItemId("plc"), name: event.venueName || event.name, address: event.venueAddress, mapUrl: event.mapUrl, imageId: event.imageId, eventId: event.id }));
                          if (added.length) setContent({ ...content, places: [...content.places, ...added] });
                        }}
                      >
                        Lấy từ sự kiện
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function eventTypeName(id: string): string {
  return EVENT_TYPES.find((item) => item.id === id)?.label || "Sự kiện";
}

function FamilyFields({ prefix, side, photos, onChange }: { prefix: string; side: InvitationContent["brideFamily"]; photos: Photo[]; onChange: (key: keyof InvitationContent["brideFamily"], value: string) => void }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id={`${prefix}-father`} label={prefix === "bride" ? "Họ tên bố cô dâu" : "Họ tên bố chú rể"} value={side.fatherName} onChange={(event) => onChange("fatherName", event.target.value)} />
        <TextField id={`${prefix}-mother`} label={prefix === "bride" ? "Họ tên mẹ cô dâu" : "Họ tên mẹ chú rể"} value={side.motherName} onChange={(event) => onChange("motherName", event.target.value)} />
      </div>
      <TextField id={`${prefix}-address`} label="Địa chỉ gia đình" value={side.familyAddress} onChange={(event) => onChange("familyAddress", event.target.value)} />
      <TextField id={`${prefix}-home`} label={prefix === "bride" ? "Quê quán cô dâu" : "Quê quán chú rể"} value={side.hometown} onChange={(event) => onChange("hometown", event.target.value)} />
      <div>
        <p className={ui.label}>Ảnh gia đình</p>
        <PhotoChoices photos={photos} value={side.familyImageId} onPick={(id) => onChange("familyImageId", id)} />
      </div>
    </>
  );
}
