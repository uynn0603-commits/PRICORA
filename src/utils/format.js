export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function parseISODate(value) {
  if (!value) return null;
  if (typeof value === "string" && value.length >= 10 && value[4] === "-") {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysUntil(value) {
  const target = parseISODate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDate(value) {
  const date = parseISODate(value);
  if (!date) return "—";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function formatLongDate(value) {
  const date = parseISODate(value);
  if (!date) return "—";
  return `${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

// Stored values stay in English so existing data and template suggestions keep working;
// only the label shown on screen is translated.
export const OCCASION_LABELS = {
  Wedding: "Cưới",
  "Pre-wedding": "Pre-wedding",
  Personal: "Cá nhân",
  Portrait: "Chân dung",
  Graduation: "Tốt nghiệp",
  Event: "Sự kiện",
  Other: "Khác",
};

export function occasionLabel(value) {
  return OCCASION_LABELS[value] || value || "";
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

const UNITS = { photo: "ảnh", album: "album", day: "ngày", file: "tệp" };

export function plural(count, word) {
  return `${count.toLocaleString("vi-VN")} ${UNITS[word] || word}`;
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "V";
  const chars = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return chars.toUpperCase();
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function frameLabel(index, total) {
  return `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
}

export function expiryPhrase(days) {
  if (days == null) return "Không giới hạn";
  if (days < 0) return "Đã hết hạn";
  if (days === 0) return "Hết hạn hôm nay";
  return `Còn ${days} ngày`;
}

export function isHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}
