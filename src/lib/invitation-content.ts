import type { InvitationStatus } from "@/lib/types";

export const TRADITIONAL_TEMPLATE_ID = "traditional-wedding";

export const EVENT_TYPES = [
  { id: "engagement", label: "Lễ ăn hỏi" },
  { id: "ceremony", label: "Lễ thành hôn" },
  { id: "groom-party", label: "Tiệc cưới nhà trai" },
  { id: "bride-party", label: "Tiệc cưới nhà gái" },
  { id: "reception", label: "Tiệc báo hỷ" },
  { id: "other", label: "Khác" },
] as const;

export const PHOTO_KINDS = [
  { id: "cover", label: "Ảnh bìa" },
  { id: "couple", label: "Ảnh cô dâu chú rể" },
  { id: "family", label: "Ảnh gia đình" },
  { id: "memory", label: "Ảnh kỷ niệm" },
  { id: "gallery", label: "Ảnh gallery" },
] as const;

const EVENT_TYPE_IDS = new Set<string>(EVENT_TYPES.map((item) => item.id));
const PHOTO_KIND_IDS = new Set<string>(PHOTO_KINDS.map((item) => item.id));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HTTPS = /^https:\/\/\S+$/;

export const LIMITS = { photos: 24, events: 8, places: 8 } as const;

export interface FamilySide {
  fatherName: string;
  motherName: string;
  familyAddress: string;
  hometown: string;
  familyImageId: string;
}

export interface WeddingEvent {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  venueName: string;
  venueAddress: string;
  mapUrl: string;
  imageId: string;
}

export interface InvitationPhoto {
  photoId: string;
  caption: string;
  kind: string;
  visible: boolean;
}

export interface WeddingPlace {
  id: string;
  name: string;
  address: string;
  mapUrl: string;
  imageId: string;
  eventId: string;
}

export interface InvitationContent {
  invitationTitle: string;
  introduction: string;
  coverImageId: string;
  studioLogoId: string;
  brideFamily: FamilySide;
  groomFamily: FamilySide;
  events: WeddingEvent[];
  invitationMessage: string;
  invitationFrom: string;
  invitationNote: string;
  closingMessage: string;
  photos: InvitationPhoto[];
  countdownEnabled: boolean;
  calendarEnabled: boolean;
  calendarHighlightDate: string;
  places: WeddingPlace[];
}

export interface InvitationDraft {
  albumId: string;
  status: InvitationStatus;
  templateId: string;
  groomName: string;
  brideName: string;
  groomParents: string;
  brideParents: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  address: string;
  mapUrl: string;
  message: string;
  thankYou: string;
  musicUrl: string;
  photoIds: string[];
  content: InvitationContent;
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function side(value: unknown): FamilySide {
  const row = record(value);
  return {
    fatherName: clip(row.fatherName, 80),
    motherName: clip(row.motherName, 80),
    familyAddress: clip(row.familyAddress, 240),
    hometown: clip(row.hometown, 120),
    familyImageId: clip(row.familyImageId, 80),
  };
}

export function emptyFamily(): FamilySide {
  return { fatherName: "", motherName: "", familyAddress: "", hometown: "", familyImageId: "" };
}

export function emptyContent(): InvitationContent {
  return {
    invitationTitle: "",
    introduction: "",
    coverImageId: "",
    studioLogoId: "",
    brideFamily: emptyFamily(),
    groomFamily: emptyFamily(),
    events: [],
    invitationMessage: "",
    invitationFrom: "",
    invitationNote: "",
    closingMessage: "",
    photos: [],
    countdownEnabled: true,
    calendarEnabled: true,
    calendarHighlightDate: "",
    places: [],
  };
}

export function newItemId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function eventTypeLabel(id: string): string {
  return EVENT_TYPES.find((item) => item.id === id)?.label || "Khác";
}

export function emptyEvent(): WeddingEvent {
  return { id: newItemId("evt"), name: "", type: "ceremony", date: "", startTime: "", venueName: "", venueAddress: "", mapUrl: "", imageId: "" };
}

export function emptyPlace(): WeddingPlace {
  return { id: newItemId("plc"), name: "", address: "", mapUrl: "", imageId: "", eventId: "" };
}

function eventFilled(event: WeddingEvent): boolean {
  return Boolean(event.name || event.date || event.startTime || event.venueName || event.venueAddress || event.mapUrl || event.imageId);
}

function placeFilled(place: WeddingPlace): boolean {
  return Boolean(place.name || place.address || place.mapUrl || place.imageId);
}

export function normalizeContent(value: unknown, dropEmpty = false): InvitationContent {
  const row = record(value);
  const events = (Array.isArray(row.events) ? row.events : [])
    .slice(0, LIMITS.events)
    .map((item, index) => {
      const event = record(item);
      const type = clip(event.type, 40);
      return {
        id: clip(event.id, 24) || `evt_${index + 1}`,
        name: clip(event.name, 80),
        type: EVENT_TYPE_IDS.has(type) ? type : "other",
        date: DATE_RE.test(clip(event.date, 10)) ? clip(event.date, 10) : "",
        startTime: TIME_RE.test(clip(event.startTime, 5)) ? clip(event.startTime, 5) : "",
        venueName: clip(event.venueName, 160),
        venueAddress: clip(event.venueAddress, 240),
        mapUrl: clip(event.mapUrl, 500),
        imageId: clip(event.imageId, 80),
      };
    })
    .filter((event) => !dropEmpty || eventFilled(event));
  const places = (Array.isArray(row.places) ? row.places : [])
    .slice(0, LIMITS.places)
    .map((item, index) => {
      const place = record(item);
      return {
        id: clip(place.id, 24) || `plc_${index + 1}`,
        name: clip(place.name, 160),
        address: clip(place.address, 240),
        mapUrl: clip(place.mapUrl, 500),
        imageId: clip(place.imageId, 80),
        eventId: clip(place.eventId, 24),
      };
    })
    .filter((place) => !dropEmpty || placeFilled(place));
  const photos = (Array.isArray(row.photos) ? row.photos : [])
    .slice(0, LIMITS.photos)
    .map((item) => {
      const photo = record(item);
      const kind = clip(photo.kind, 20);
      return {
        photoId: clip(photo.photoId, 80),
        caption: clip(photo.caption, 160),
        kind: PHOTO_KIND_IDS.has(kind) ? kind : "gallery",
        visible: photo.visible !== false,
      };
    })
    .filter((photo) => photo.photoId);
  const highlight = clip(row.calendarHighlightDate, 10);
  return {
    invitationTitle: clip(row.invitationTitle, 80),
    introduction: clip(row.introduction, 1500),
    coverImageId: clip(row.coverImageId, 80),
    studioLogoId: clip(row.studioLogoId, 80),
    brideFamily: side(row.brideFamily),
    groomFamily: side(row.groomFamily),
    events,
    invitationMessage: clip(row.invitationMessage, 2000),
    invitationFrom: clip(row.invitationFrom, 160),
    invitationNote: clip(row.invitationNote, 500),
    closingMessage: clip(row.closingMessage, 800),
    photos,
    countdownEnabled: row.countdownEnabled !== false,
    calendarEnabled: row.calendarEnabled !== false,
    calendarHighlightDate: DATE_RE.test(highlight) ? highlight : "",
    places,
  };
}

export function isBlankContent(content: InvitationContent): boolean {
  const family = (side: FamilySide) => side.fatherName || side.motherName || side.familyAddress || side.hometown || side.familyImageId;
  return !(
    content.invitationTitle ||
    content.introduction ||
    content.coverImageId ||
    content.studioLogoId ||
    family(content.brideFamily) ||
    family(content.groomFamily) ||
    content.events.length ||
    content.invitationMessage ||
    content.invitationFrom ||
    content.invitationNote ||
    content.closingMessage ||
    content.photos.length ||
    content.places.length ||
    content.calendarHighlightDate
  );
}

export function contentFromLegacy(draft: InvitationDraft): InvitationContent {
  const content = emptyContent();
  content.invitationMessage = draft.message;
  content.closingMessage = draft.thankYou;
  content.coverImageId = draft.photoIds[0] || "";
  content.groomFamily = { ...content.groomFamily, fatherName: draft.groomParents };
  content.brideFamily = { ...content.brideFamily, fatherName: draft.brideParents };
  if (draft.venue || draft.address || draft.mapUrl || draft.weddingTime) {
    content.events = [
      {
        ...emptyEvent(),
        name: "Lễ thành hôn",
        type: "ceremony",
        date: draft.weddingDate,
        startTime: TIME_RE.test(draft.weddingTime) ? draft.weddingTime : "",
        venueName: draft.venue,
        venueAddress: draft.address,
        mapUrl: draft.mapUrl,
      },
    ];
  }
  content.photos = draft.photoIds.map((photoId, index) => ({
    photoId,
    caption: "",
    kind: index === 0 ? "cover" : index === 1 ? "couple" : "gallery",
    visible: true,
  }));
  return content;
}

export function contentPhotoIds(content: InvitationContent): string[] {
  const ids = [
    content.coverImageId,
    content.studioLogoId,
    content.brideFamily.familyImageId,
    content.groomFamily.familyImageId,
    ...content.events.map((event) => event.imageId),
    ...content.places.map((place) => place.imageId),
    ...content.photos.filter((photo) => photo.visible).map((photo) => photo.photoId),
  ];
  return [...new Set(ids.filter(Boolean))].slice(0, LIMITS.photos);
}

function joinNames(side: FamilySide): string {
  return [side.fatherName, side.motherName].filter(Boolean).join(" · ").slice(0, 160);
}

// Keeps the original columns in sync so the list, the public title and the older templates still work.
export function mirroredFields(content: InvitationContent): Pick<InvitationDraft, "groomParents" | "brideParents" | "weddingTime" | "venue" | "address" | "mapUrl" | "message" | "thankYou" | "photoIds"> {
  const event = content.events.find((item) => item.venueName || item.venueAddress || item.mapUrl) || content.events[0];
  const place = content.places.find((item) => item.mapUrl) || content.places[0];
  return {
    groomParents: joinNames(content.groomFamily),
    brideParents: joinNames(content.brideFamily),
    weddingTime: event?.startTime || "",
    venue: event?.venueName || place?.name || "",
    address: event?.venueAddress || place?.address || "",
    mapUrl: event?.mapUrl || place?.mapUrl || "",
    message: (content.invitationMessage || content.introduction).slice(0, 1000),
    thankYou: content.closingMessage.slice(0, 500),
    photoIds: contentPhotoIds(content),
  };
}

export function applyTraditionalMirror(draft: InvitationDraft): InvitationDraft {
  if (draft.templateId !== TRADITIONAL_TEMPLATE_ID) return draft;
  return { ...draft, ...mirroredFields(draft.content) };
}

export function countdownClock(draft: Pick<InvitationDraft, "weddingDate" | "content">): string {
  const sameDay = draft.content.events.find((event) => event.date === draft.weddingDate && event.startTime);
  const any = draft.content.events.find((event) => event.startTime);
  return sameDay?.startTime || any?.startTime || "00:00";
}

export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const next = index + delta;
  if (next < 0 || next >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item);
  return copy;
}

function familyStarted(side: FamilySide): boolean {
  return Boolean(side.fatherName || side.motherName || side.familyAddress || side.hometown || side.familyImageId);
}

export type GroupId = "general" | "bride" | "groom" | "events" | "letter" | "photos" | "calendar" | "maps";
export type GroupFill = "empty" | "partial" | "ready";

export function groupFill(group: GroupId, draft: InvitationDraft): GroupFill {
  const content = draft.content;
  if (group === "general") {
    const flags = [content.invitationTitle, draft.brideName, draft.groomName, draft.weddingDate, content.coverImageId].map(Boolean);
    if (flags.every(Boolean)) return "ready";
    if (flags.some(Boolean) || content.introduction || content.studioLogoId || draft.musicUrl) return "partial";
    return "empty";
  }
  if (group === "bride") return familyStarted(content.brideFamily) ? "ready" : "empty";
  if (group === "groom") return familyStarted(content.groomFamily) ? "ready" : "empty";
  if (group === "events") return content.events.length ? "ready" : "empty";
  if (group === "letter") return content.invitationMessage || content.invitationFrom || content.invitationNote || content.closingMessage ? "ready" : "empty";
  if (group === "photos") return content.photos.length ? "ready" : "empty";
  if (group === "calendar") {
    if (!content.calendarEnabled && !content.countdownEnabled) return "empty";
    return draft.weddingDate ? "ready" : "partial";
  }
  return content.places.length ? "ready" : "empty";
}

function known(ids: Set<string> | null | undefined, id: string): boolean {
  return !id || !ids || ids.has(id);
}

// `knownPhotoIds` is null while the album list is still loading. Pass a set to reject photos from another album.
export function fieldErrors(draft: InvitationDraft, knownPhotoIds?: Set<string> | null): Record<string, string> {
  const errors: Record<string, string> = {};
  const content = draft.templateId === TRADITIONAL_TEMPLATE_ID ? draft.content : null;
  if (!draft.groomName.trim()) errors.groomName = "Vui lòng nhập họ tên chú rể.";
  if (!draft.brideName.trim()) errors.brideName = "Vui lòng nhập họ tên cô dâu.";
  if (draft.weddingDate && !DATE_RE.test(draft.weddingDate)) errors.weddingDate = "Ngày cưới không hợp lệ.";
  if (draft.musicUrl && !HTTPS.test(draft.musicUrl)) errors.musicUrl = "Liên kết nhạc phải bắt đầu bằng https://.";
  if (draft.mapUrl && !HTTPS.test(draft.mapUrl)) errors.mapUrl = "Liên kết bản đồ phải bắt đầu bằng https://.";
  if (!content) return errors;

  const ids = contentPhotoIds(content);
  if (ids.length && !draft.albumId) errors.albumId = "Hãy chọn album trước khi chọn ảnh.";
  if (knownPhotoIds && ids.some((id) => !knownPhotoIds.has(id))) errors.albumId = "Một số ảnh không còn trong album. Vui lòng chọn lại.";
  if (content.calendarHighlightDate && !DATE_RE.test(content.calendarHighlightDate)) errors.calendarHighlightDate = "Ngày đánh dấu không hợp lệ.";
  content.events.forEach((event, index) => {
    if (event.mapUrl && !HTTPS.test(event.mapUrl)) errors[`events.${index}.mapUrl`] = "Liên kết bản đồ phải bắt đầu bằng https://.";
    if (event.date && !DATE_RE.test(event.date)) errors[`events.${index}.date`] = "Ngày tổ chức không hợp lệ.";
    if (event.startTime && !TIME_RE.test(event.startTime)) errors[`events.${index}.startTime`] = "Giờ bắt đầu không hợp lệ.";
  });
  content.places.forEach((place, index) => {
    if (place.mapUrl && !HTTPS.test(place.mapUrl)) errors[`places.${index}.mapUrl`] = "Liên kết bản đồ phải bắt đầu bằng https://.";
  });

  if (draft.status !== "published") return errors;
  if (!content.invitationTitle.trim()) errors.invitationTitle = "Vui lòng nhập tiêu đề thiệp.";
  if (!draft.weddingDate) errors.weddingDate = "Vui lòng nhập ngày cưới.";
  if (!content.coverImageId) errors.coverImageId = "Vui lòng chọn ảnh bìa.";
  else if (!known(knownPhotoIds, content.coverImageId)) errors.coverImageId = "Ảnh bìa không còn trong album.";
  if (!draft.albumId) errors.albumId = errors.albumId || "Hãy chọn album để lấy ảnh bìa.";
  return errors;
}

export function firstError(errors: Record<string, string>): string {
  return Object.values(errors)[0] || "";
}

export function groupForError(key: string): GroupId {
  if (key.startsWith("events")) return "events";
  if (key.startsWith("places")) return "maps";
  if (key === "calendarHighlightDate") return "calendar";
  if (key.startsWith("bride")) return "bride";
  if (key.startsWith("groom")) return "groom";
  return "general";
}
