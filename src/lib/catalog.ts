// Pure metadata for every album template. Kept free of rendering imports so the data
// layer can read it without pulling in template code. Add a new template by adding an
// entry here and registering its component in components/templates/index.ts.
export const DEFAULT_TEMPLATE_ID = "masonry-gallery";

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  style: string[];
  bestFor: string[];
  swatch: { bg: string; ink: string; accent: string };
}

export const TEMPLATE_CATALOG: TemplateMeta[] = [
  {
    id: "wedding-luxury",
    name: "Wedding Luxury",
    description: "Khung ảnh lớn, nhiều khoảng thở cùng kiểu chữ serif tinh tế.",
    style: ["Sang trọng", "Thanh lịch", "Lãng mạn"],
    bestFor: ["Cưới", "Pre-wedding", "Lễ cưới"],
    swatch: { bg: "#FAF9F6", ink: "#29251F", accent: "#B99A72" },
  },
  {
    id: "editorial-magazine",
    name: "Editorial Magazine",
    description: "Bố cục bất đối xứng, ảnh đánh số và kiểu chữ như tạp chí thời trang.",
    style: ["Tạp chí", "Sáng tạo", "Hiện đại"],
    bestFor: ["Chân dung", "Thời trang", "Cặp đôi"],
    swatch: { bg: "#F4F1EC", ink: "#222222", accent: "#A18B76" },
  },
  {
    id: "masonry-gallery",
    name: "Masonry Gallery",
    description: "Lưới masonry gọn gàng, tải nhanh, hiển thị nhiều ảnh cùng lúc.",
    style: ["Hiện đại", "Gọn gàng", "Tối giản"],
    bestFor: ["Tốt nghiệp", "Sự kiện", "Album nhiều ảnh"],
    swatch: { bg: "#FFFFFF", ink: "#202124", accent: "#7552F6" },
  },
  {
    id: "dark-cinematic",
    name: "Dark Cinematic",
    description: "Mở đầu toàn màn hình, nền tối và khung hình rộng như một bộ phim.",
    style: ["Điện ảnh", "Kịch tính", "Cao cấp"],
    bestFor: ["Pre-wedding", "Thời trang", "Chân dung nghệ thuật"],
    swatch: { bg: "#111111", ink: "#FFFFFF", accent: "#C8A96A" },
  },
];

const BY_OCCASION: Record<string, string> = {
  Wedding: "wedding-luxury",
  "Pre-wedding": "dark-cinematic",
  Personal: "editorial-magazine",
  Portrait: "editorial-magazine",
  Graduation: "masonry-gallery",
  Event: "masonry-gallery",
};

export function getTemplateMeta(id?: string): TemplateMeta {
  return TEMPLATE_CATALOG.find((item) => item.id === id) || TEMPLATE_CATALOG.find((item) => item.id === DEFAULT_TEMPLATE_ID)!;
}

export function isTemplateId(id?: string): boolean {
  return TEMPLATE_CATALOG.some((item) => item.id === id);
}

export function suggestTemplateId(occasion?: string): string {
  return (occasion && BY_OCCASION[occasion]) || DEFAULT_TEMPLATE_ID;
}
