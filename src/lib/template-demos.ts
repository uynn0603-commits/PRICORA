import { buildPhotos } from "./mock";
import type { Album, Photo } from "./types";

interface DemoSource {
  name: string;
  customerName: string;
  occasion: string;
  shootingDate: string;
  description: string;
  salt: number;
  pool: string[];
}

export type DemoAlbum = Pick<
  Album,
  | "id"
  | "slug"
  | "name"
  | "customerName"
  | "occasion"
  | "shootingDate"
  | "description"
  | "coverId"
  | "coverDataUrl"
  | "coverSession"
  | "password"
  | "templateId"
  | "allowDownload"
  | "status"
  | "photos"
> & { coverPhoto: Photo };

// Sample albums used only by template previews. They share the stored album shape, so
// templates render them exactly like a real client album.
const DEMOS: Record<string, DemoSource> = {
  "wedding-luxury": {
    name: "Lễ cưới Minh Anh & Hoàng Nam",
    customerName: "Minh Anh & Hoàng Nam",
    occasion: "Wedding",
    shootingDate: "2026-09-26",
    description:
      "Một buổi chiều cuối thu tại Đà Lạt — những lời hứa giản dị, ánh nắng dịu và khoảnh khắc của hai gia đình trở thành một.",
    salt: 41,
    pool: [
      "photo-1591604466107-ec97de577aff",
      "photo-1519741497674-611481863552",
      "photo-1465495976277-4387d4b0b4c6",
      "photo-1520854221256-17451cc331bf",
      "photo-1537633552985-df8429e8048b",
      "photo-1583939003579-730e3918a45a",
      "photo-1460978812857-470ed1c77af0",
      "photo-1511285560929-80b456fea0bc",
      "photo-1606800052052-a08af7148866",
      "photo-1546032996-6dfacbacbf3f",
      "photo-1594552072238-b8a33785b261",
      "photo-1469371670807-013ccf25f16a",
      "photo-1516589178581-6cd7833ae3b2",
      "photo-1478146896981-b80fe463b330",
      "photo-1519225421980-715cb0215aed",
      "photo-1522673607200-164d1b6ce486",
      "photo-1502635385003-ee1e6a1a742d",
    ],
  },
  "editorial-magazine": {
    name: "Mùa thu dịu dàng",
    customerName: "Linh Chi",
    occasion: "Portrait",
    shootingDate: "2026-08-14",
    description:
      "Một buổi chụp chân dung theo tinh thần tạp chí: chất liệu tự nhiên, ánh sáng cửa sổ và những biểu cảm không cần sắp đặt.",
    salt: 42,
    pool: [
      "photo-1524504388940-b1c1722653e1",
      "photo-1488426862026-3ee34a7d66df",
      "photo-1529626455594-4ff0802cfb7e",
      "photo-1517841905240-472988babdf9",
      "photo-1494790108377-be9c29b29330",
      "photo-1544005313-94ddf0286df2",
      "photo-1531123897727-8f129e1688ce",
      "photo-1487412720507-e7ab37603c6f",
      "photo-1469334031218-e382a71b716b",
      "photo-1487412947147-5cebf100ffc2",
      "photo-1554151228-14d9def656e4",
      "photo-1438761681033-6461ffad8d80",
      "photo-1524502397800-2eeaad7c3fe5",
      "photo-1483985988355-763728e1935b",
      "photo-1501196354995-cbb51c65aaea",
      "photo-1539571696357-5a69c17a67c6",
      "photo-1507003211169-0a1dd7228f2d",
      "photo-1500648767791-00dcc994a43e",
    ],
  },
  "masonry-gallery": {
    name: "Lễ tốt nghiệp K21",
    customerName: "Lớp K21 — Đại học Kiến trúc",
    occasion: "Graduation",
    shootingDate: "2026-06-20",
    description: "Toàn bộ khoảnh khắc trong ngày lễ tốt nghiệp: nghi thức trao bằng, ảnh lớp, bạn bè và buổi tiệc tối.",
    salt: 43,
    pool: [
      "photo-1541339907198-e08756dedf3f",
      "photo-1627556704290-2b1f5853ff78",
      "photo-1523580846011-d3a5bc25702b",
      "photo-1590012314607-cda9d9b699ae",
      "photo-1529333166437-7750a6dd5a70",
      "photo-1523240795612-9a054b0db644",
      "photo-1523580494863-6f3031224c94",
      "photo-1562774053-701939374585",
      "photo-1607237138185-eedd9c632b0b",
      "photo-1427504494785-3a9ca7044f45",
      "photo-1524178232363-1fb2b075b655",
      "photo-1492684223066-81342ee5ff30",
      "photo-1511578314322-379afb476865",
      "photo-1501281668745-f7f57925c3b4",
      "photo-1464366400600-7168b8af9bc3",
      "photo-1519671482749-fd09be7ccebf",
      "photo-1530103862676-de8c9debad1d",
      "photo-1516589091380-5d8e87df6999",
    ],
  },
  "dark-cinematic": {
    name: "Ngọc Hà & Quang Minh — Trước bình minh",
    customerName: "Ngọc Hà & Quang Minh",
    occasion: "Pre-wedding",
    shootingDate: "2026-10-03",
    description:
      "Chúng tôi đi trước bình minh, khi thành phố còn ngủ. Sương, gió và những cái nắm tay — một thước phim nhỏ trước ngày cưới.",
    salt: 44,
    pool: [
      "photo-1537633552985-df8429e8048b",
      "photo-1606216794074-735e91aa2c92",
      "photo-1474552226712-ac0f0961a954",
      "photo-1519085360753-af0119f7cbe7",
      "photo-1418065460487-3e41a6c84dc5",
      "photo-1544077960-604201fe74bc",
      "photo-1534528741775-53994a69daeb",
      "photo-1471341971476-ae15ff5dd4ea",
      "photo-1500534314209-a25ddb2bd429",
      "photo-1475924156734-496f6cac6ec1",
      "photo-1504257432389-52343af06ae3",
      "photo-1531746020798-e6953c6e8e04",
      "photo-1552168324-d612d77725e3",
      "photo-1519741497674-611481863552",
      "photo-1426604966848-d7adac402bff",
      "photo-1470252649378-9c29740c9fa8",
    ],
  },
};

const cache = new Map<string, DemoAlbum>();

export function getDemoAlbum(templateId: string): DemoAlbum | null {
  const demo = DEMOS[templateId];
  if (!demo) return null;
  const cached = cache.get(templateId);
  if (cached) return cached;
  const created = new Date(`${demo.shootingDate}T12:00:00`);
  const [cover, ...rest] = buildPhotos(demo.pool, demo.pool.length, created, demo.salt);
  const album: DemoAlbum = {
    id: `demo_${templateId}`,
    slug: `demo-${templateId}`,
    name: demo.name,
    customerName: demo.customerName,
    occasion: demo.occasion,
    shootingDate: demo.shootingDate,
    description: demo.description,
    coverPhoto: { ...cover, w: 3, h: 2, fp: "faces" },
    coverId: "",
    coverDataUrl: "",
    coverSession: false,
    password: "",
    templateId,
    allowDownload: true,
    status: "published",
    photos: rest,
  };
  cache.set(templateId, album);
  return album;
}
