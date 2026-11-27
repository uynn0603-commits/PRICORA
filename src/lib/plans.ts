import type { Plan } from "./types";

const GB = 1024 * 1024 * 1024;

// Limits are enforced by the store. `null` means unlimited.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Miễn phí",
    price: 0,
    storage: 5 * GB,
    albums: 10,
    members: 2,
    invitations: 1,
    description: "Cho nhiếp ảnh gia mới bắt đầu giao ảnh online.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 199000,
    storage: 200 * GB,
    albums: null,
    members: 5,
    invitations: null,
    description: "Cho studio giao album đều đặn mỗi tuần.",
  },
  {
    id: "business",
    name: "Business",
    price: 599000,
    storage: 1024 * GB,
    albums: null,
    members: 20,
    invitations: null,
    description: "Cho studio nhiều chi nhánh và đội ngũ lớn.",
  },
];

export const DEFAULT_PLAN_ID = "free";

export function getPlanById(id?: string | null): Plan {
  return PLANS.find((plan) => plan.id === id) || PLANS.find((plan) => plan.id === DEFAULT_PLAN_ID)!;
}

export function formatPrice(value: number): string {
  return value ? `${value.toLocaleString("vi-VN")}đ/tháng` : "0đ";
}

export function limitLabel(value: number | null, unit = ""): string {
  if (value == null) return unit ? `Không giới hạn ${unit}` : "Không giới hạn";
  return `${value.toLocaleString("vi-VN")}${unit ? ` ${unit}` : ""}`;
}
