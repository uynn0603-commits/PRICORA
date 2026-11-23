"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountTab } from "@/components/settings/AccountTab";
import { BrandingTab } from "@/components/settings/BrandingTab";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { MembersTab } from "@/components/settings/MembersTab";
import { PlanTab } from "@/components/settings/PlanTab";
import type { Reload, SettingsTab } from "@/components/settings/types";
import { cn } from "@/lib/format";
import { isOwner } from "@/lib/store";
import { useStore, useTitle } from "@/lib/use-store";

const TABS: Array<{ id: SettingsTab; label: string; owner: boolean }> = [
  { id: "general", label: "Studio", owner: true },
  { id: "branding", label: "Thương hiệu", owner: true },
  { id: "members", label: "Thành viên", owner: true },
  { id: "plan", label: "Gói dịch vụ", owner: true },
  { id: "account", label: "Tài khoản", owner: false },
];

const VIEWS: Record<SettingsTab, (props: { reload: Reload }) => ReactNode> = {
  general: GeneralTab,
  branding: BrandingTab,
  members: MembersTab,
  plan: PlanTab,
  account: AccountTab,
};

export default function SettingsPage() {
  useStore();
  useTitle("Cài đặt · PICORA");
  const router = useRouter();
  const query = useSearchParams().get("tab");
  const [reloadKey, setReloadKey] = useState(0);
  const owner = isOwner();
  const tabs = TABS.filter((item) => owner || !item.owner);
  const tab = tabs.find((item) => item.id === query)?.id || tabs[0].id;

  const reload = useCallback<Reload>(
    (next) => {
      setReloadKey((value) => value + 1);
      router.replace(`/admin/settings?tab=${next}`, { scroll: false });
    },
    [router],
  );

  const View = VIEWS[tab];
  return (
    <>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Cài đặt</h1>
        <p className="mt-1 text-sm text-mist">
          {owner
            ? "Thông tin studio, thương hiệu, đội ngũ, gói dịch vụ và tài khoản của bạn."
            : "Tài khoản đăng nhập của bạn. Chủ studio quản lý các cài đặt còn lại."}
        </p>
      </div>
      <div className="mb-6 flex gap-5 overflow-x-auto border-b border-line">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/admin/settings?tab=${item.id}`}
            className={cn("shrink-0 border-b-2 pb-3 text-sm font-semibold", tab === item.id ? "border-primary text-ink" : "border-transparent text-mist")}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <View key={`${tab}-${reloadKey}`} reload={reload} />
    </>
  );
}
