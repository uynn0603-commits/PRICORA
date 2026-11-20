const GB = 1024 * 1024 * 1024;

// Limits are enforced by the store. `null` means unlimited.
export const PLANS = [
  {
    id: "free",
    name: "Miễn phí",
    price: 0,
    storage: 5 * GB,
    albums: 10,
    members: 2,
    description: "Cho nhiếp ảnh gia mới bắt đầu giao ảnh online.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 199000,
    storage: 200 * GB,
    albums: null,
    members: 5,
    description: "Cho studio giao album đều đặn mỗi tuần.",
  },
  {
    id: "business",
    name: "Business",
    price: 599000,
    storage: 1024 * GB,
    albums: null,
    members: 20,
    description: "Cho studio nhiều chi nhánh và đội ngũ lớn.",
  },
];

export const DEFAULT_PLAN_ID = "free";

export function getPlanById(id) {
  return PLANS.find((plan) => plan.id === id) || PLANS.find((plan) => plan.id === DEFAULT_PLAN_ID);
}

export function formatPrice(value) {
  return value ? `${value.toLocaleString("vi-VN")}đ/tháng` : "0đ";
}

export function limitLabel(value, unit = "") {
  if (value == null) return unit ? `Không giới hạn ${unit}` : "Không giới hạn";
  return `${value.toLocaleString("vi-VN")}${unit ? ` ${unit}` : ""}`;
}
