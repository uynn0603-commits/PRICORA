import { cameras, events, fashion, graduation, men, moody, outdoor, rotate, wedding, weddingExtra, women } from "./library";
import { toISODate } from "./format";
import type { Album, AlbumStatus, Database, Photo, StudioSettings } from "./types";

export const SEED_TEMPLATES: Record<string, string> = {
  alb_minh_anh: "wedding-luxury",
  alb_thu_trang: "dark-cinematic",
  alb_linh_chi: "editorial-magazine",
  alb_hoang_long: "masonry-gallery",
  alb_ngoc_ha: "dark-cinematic",
  alb_tuan_anh: "editorial-magazine",
  alb_mai_phuong: "masonry-gallery",
  alb_thanh_tung: "masonry-gallery",
  alb_lm_an_khang: "wedding-luxury",
  alb_lm_hai_yen: "dark-cinematic",
};

export const PICORA_DEFAULTS = {
  platformName: "PICORA",
  slogan: "Your Photos. Your Memories.",
};

const ASPECTS = [
  { w: 4, h: 5 },
  { w: 3, h: 2 },
  { w: 1, h: 1 },
  { w: 3, h: 4 },
  { w: 16, h: 10 },
  { w: 2, h: 3 },
  { w: 5, h: 4 },
  { w: 4, h: 5 },
];

const FOCALS = ["entropy", "faces", "top", "center", "bottom"];

function photoBytes(seed: number) {
  const megabytes = 3.4 + ((Math.abs(seed) * 17) % 33) / 10;
  return Math.round(megabytes * 1024 * 1024);
}

function monthDate(offset: number, day: number) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12, 0, 0, 0);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (date > endOfToday) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  }
  return date;
}

function daysFromToday(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function buildPhotos(pool: string[], count: number, createdAt: Date, salt: number): Photo[] {
  return Array.from({ length: count }, (_, index) => {
    const aspect = ASPECTS[(index + salt) % ASPECTS.length];
    return {
      id: `p_${salt}_${index + 1}`,
      name: `IMG_${String(1800 + salt * 90 + index).padStart(4, "0")}.jpg`,
      unsplash: pool[index % pool.length],
      fp: FOCALS[(index + salt) % FOCALS.length],
      w: aspect.w,
      h: aspect.h,
      size: photoBytes(salt * 100 + index),
      uploadedAt: createdAt.toISOString(),
      sessionOnly: false,
    };
  });
}

export const SEED_STUDIO_ID = "std_minhkhoa";

export function studioSettings(overrides: Partial<StudioSettings> = {}): StudioSettings {
  return {
    defaultExpirationDays: 90,
    defaultPasswordProtection: false,
    slogan: PICORA_DEFAULTS.slogan,
    primaryColor: "#7552F6",
    secondaryColor: "#C94DEB",
    logoDataUrl: "",
    ...overrides,
  };
}

interface AlbumSeed {
  id: string;
  studioId?: string;
  slug: string;
  name: string;
  customerName: string;
  customerPhone: string;
  occasion: string;
  description: string;
  month: number;
  day: number;
  expiresAt: string;
  status: AlbumStatus;
  count: number;
  pool: string[];
  salt: number;
  password: string;
  selectionLimit?: number;
  // Photo positions the demo customer has already sent back.
  picked?: number[];
  pickedNote?: string;
  // Retouch requests keyed by photo position.
  pickedNotes?: Record<number, string>;
}

function makeAlbum(config: AlbumSeed): Album {
  const created = monthDate(config.month, config.day);
  const photos = buildPhotos(config.pool, config.count, created, config.salt);
  return {
    id: config.id,
    studioId: config.studioId || SEED_STUDIO_ID,
    slug: config.slug,
    name: config.name,
    customerName: config.customerName,
    customerPhone: config.customerPhone,
    occasion: config.occasion,
    shootingDate: toISODate(created),
    description: config.description,
    coverId: photos[0]?.id || "",
    mobileCoverId: "",
    coverDataUrl: "",
    coverSession: false,
    password: config.password || "",
    expiresAt: config.expiresAt,
    status: config.status,
    templateId: SEED_TEMPLATES[config.id] || "masonry-gallery",
    allowDownload: true,
    selectionEnabled: Boolean(config.selectionLimit),
    selectionLimit: config.selectionLimit || 0,
    selectionLocked: false,
    selection: config.picked
      ? {
          photoIds: config.picked.map((index) => photos[index]?.id).filter(Boolean),
          note: config.pickedNote || "",
          photoNotes: Object.fromEntries(
            Object.entries(config.pickedNotes || {})
              .filter(([index]) => photos[Number(index)])
              .map(([index, text]) => [photos[Number(index)].id, text]),
          ),
          photoEdits: {},
          submittedAt: monthDate(config.month, config.day + 3).toISOString(),
        }
      : null,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    photos,
  };
}

export function createSeed(): Database {
  const weddingA = wedding.concat(weddingExtra, outdoor);
  const weddingB = rotate(wedding, 1).concat(weddingExtra.slice(0, 3), moody.slice(0, 3));
  const weddingC = rotate(wedding, 2).concat(weddingExtra, outdoor);
  const prewedding = rotate(wedding, 5).concat(moody, weddingExtra.slice(1, 3));
  const personal = women.concat(fashion);
  const graduationPool = graduation.concat(men.slice(0, 3), women.slice(0, 3));
  const portrait = men.concat(cameras);
  const event = events.concat(graduation.slice(4, 6));

  const now = new Date().toISOString();
  return {
    version: 3,
    users: [
      { id: "usr_khoa", name: "Nguyễn Minh Khoa", email: "khoa@minhkhoa.studio", password: "123456" },
      { id: "usr_thuha", name: "Trần Thu Hà", email: "thuha@minhkhoa.studio", password: "123456" },
      { id: "usr_lan", name: "Lê Ngọc Lan", email: "lan@lumiere.vn", password: "123456" },
      { id: "usr_platform", name: "Quản trị PICORA", email: "admin@picora.vn", password: "123456", platformAdmin: true },
    ],
    studios: [
      {
        id: SEED_STUDIO_ID,
        slug: "minh-khoa-studio",
        name: "Minh Khoa Studio",
        planId: "free",
        status: "active",
        createdAt: monthDate(-8, 2).toISOString(),
        settings: studioSettings(),
      },
      {
        id: "std_lumiere",
        slug: "lumiere-wedding",
        name: "Lumière Wedding",
        planId: "pro",
        status: "active",
        createdAt: monthDate(-3, 10).toISOString(),
        settings: studioSettings({ primaryColor: "#B4685A", secondaryColor: "#D9A441", slogan: "Lưu giữ ngày trọng đại." }),
      },
    ],
    memberships: [
      { userId: "usr_khoa", studioId: SEED_STUDIO_ID, role: "owner", createdAt: now },
      { userId: "usr_thuha", studioId: SEED_STUDIO_ID, role: "staff", createdAt: now },
      { userId: "usr_lan", studioId: "std_lumiere", role: "owner", createdAt: now },
    ],
    notificationsRead: [],
    albums: [
      makeAlbum({
        id: "alb_lm_an_khang",
        studioId: "std_lumiere",
        slug: "an-khang-bao-ngoc",
        name: "An Khang & Bảo Ngọc",
        customerName: "An Khang & Bảo Ngọc",
        customerPhone: "0937 204 118",
        occasion: "Wedding",
        description: "Lễ gia tiên buổi sáng ở Huế, áo dài đỏ và mâm quả truyền thống.",
        month: -1,
        day: 6,
        expiresAt: daysFromToday(60),
        status: "published",
        count: 64,
        pool: rotate(wedding, 3).concat(weddingExtra),
        salt: 11,
        password: "",
      }),
      makeAlbum({
        id: "alb_lm_hai_yen",
        studioId: "std_lumiere",
        slug: "hai-yen-pre-wedding",
        name: "Hải Yến — Pre-wedding Hội An",
        customerName: "Hải Yến & Minh Đức",
        customerPhone: "0905 310 926",
        occasion: "Pre-wedding",
        description: "Phố cổ lúc chạng vạng, đèn lồng và những con hẻm vàng.",
        month: 0,
        day: 2,
        expiresAt: daysFromToday(30),
        status: "published",
        count: 48,
        pool: rotate(moody, 2).concat(outdoor),
        salt: 12,
        password: "",
      }),
      makeAlbum({
        id: "alb_minh_anh",
        slug: "minh-anh-hoang-nam",
        name: "Minh Anh & Hoàng Nam",
        customerName: "Minh Anh & Hoàng Nam",
        customerPhone: "0903 112 448",
        occasion: "Wedding",
        description: "Lễ cưới tại Đà Lạt, ánh sáng cuối thu và khoảnh khắc của hai họ.",
        month: -1,
        day: 12,
        expiresAt: daysFromToday(75),
        status: "published",
        count: 120,
        pool: weddingA,
        salt: 1,
        password: "",
        selectionLimit: 50,
      }),
      makeAlbum({
        id: "alb_thu_trang",
        slug: "thu-trang-duc-anh",
        name: "Thu Trang & Đức Anh",
        customerName: "Thu Trang & Đức Anh",
        customerPhone: "0918 220 775",
        occasion: "Wedding",
        description: "Tiệc cưới ấm ở Sài Gòn, bàn dài và những cái ôm sau lễ.",
        month: -4,
        day: 19,
        expiresAt: daysFromToday(120),
        status: "published",
        count: 85,
        pool: weddingB,
        salt: 2,
        password: "",
      }),
      makeAlbum({
        id: "alb_linh_chi",
        slug: "linh-chi",
        name: "Linh Chi",
        customerName: "Linh Chi",
        customerPhone: "0988 441 230",
        occasion: "Personal",
        description: "Bộ chân dung cá nhân với ánh sáng mềm và phông tối giản.",
        month: -6,
        day: 14,
        expiresAt: daysFromToday(90),
        status: "published",
        count: 65,
        pool: personal,
        salt: 3,
        password: "",
      }),
      makeAlbum({
        id: "alb_hoang_long",
        slug: "hoang-long",
        name: "Hoàng Long",
        customerName: "Hoàng Long",
        customerPhone: "0902 778 615",
        occasion: "Graduation",
        description: "Ngày tốt nghiệp: áo cử nhân, hành lang và bạn cùng lớp.",
        month: -7,
        day: 18,
        expiresAt: daysFromToday(45),
        status: "published",
        count: 150,
        pool: graduationPool,
        salt: 4,
        password: "",
      }),
      makeAlbum({
        id: "alb_ngoc_ha",
        slug: "ngoc-ha",
        name: "Ngọc Hà",
        customerName: "Ngọc Hà",
        customerPhone: "0933 560 194",
        occasion: "Pre-wedding",
        description: "Pre-wedding trên đồi thông, hồ nước và ánh nắng muộn.",
        month: 0,
        day: 4,
        expiresAt: daysFromToday(10),
        status: "published",
        count: 98,
        pool: prewedding,
        salt: 5,
        password: "prewed98",
        selectionLimit: 30,
        picked: [0, 3, 5, 8, 12, 15, 19, 22, 27, 31, 36, 40, 44, 51, 58, 63, 70, 77],
        pickedNote: "Em muốn chỉnh da nhẹ và làm sáng các ảnh ở hồ nước ạ.",
        pickedNotes: {
          3: "Xóa giúp em người đi phía sau.",
          12: "Làm sáng mặt, ảnh này em in khổ 60×90.",
          31: "Chỉnh váy cho phẳng, bỏ nếp nhăn.",
        },
      }),
      makeAlbum({
        id: "alb_tuan_anh",
        slug: "tuan-anh",
        name: "Tuấn Anh",
        customerName: "Tuấn Anh",
        customerPhone: "0977 318 042",
        occasion: "Portrait",
        description: "Chân dung nam, tông ấm, phông studio tối giản.",
        month: 0,
        day: 8,
        expiresAt: daysFromToday(40),
        status: "draft",
        count: 45,
        pool: portrait,
        salt: 6,
        password: "",
      }),
      makeAlbum({
        id: "alb_mai_phuong",
        slug: "mai-phuong-quoc-bao",
        name: "Mai Phương & Quốc Bảo",
        customerName: "Mai Phương & Quốc Bảo",
        customerPhone: "0908 664 219",
        occasion: "Wedding",
        description: "Lễ ngoài trời lúc hoàng hôn, hoa bàn tiệc và bước đi trên cỏ.",
        month: -1,
        day: 25,
        expiresAt: daysFromToday(5),
        status: "published",
        count: 180,
        pool: weddingC,
        salt: 7,
        password: "",
      }),
      makeAlbum({
        id: "alb_thanh_tung",
        slug: "thanh-tung",
        name: "Thanh Tùng",
        customerName: "Thanh Tùng",
        customerPhone: "0912 883 507",
        occasion: "Event",
        description: "Đêm ra mắt sản phẩm: sân khấu, khách mời và ánh đèn.",
        month: -5,
        day: 20,
        expiresAt: daysFromToday(-40),
        status: "published",
        count: 75,
        pool: event,
        salt: 8,
        password: "",
      }),
    ],
  };
}
