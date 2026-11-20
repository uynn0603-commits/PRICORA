"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { StudioMark } from "@/components/ui/Logo";
import { isHex } from "@/lib/format";
import { readAsDataUrl } from "@/lib/media";
import { toast } from "@/lib/overlay";
import { applyBrand, currentStudio, getSettings, updateSettings } from "@/lib/store";
import { ui } from "@/lib/ui";
import type { Reload } from "./types";

type ColorKey = "primaryColor" | "secondaryColor";

const CSS_VAR: Record<ColorKey, string> = { primaryColor: "--brand-primary", secondaryColor: "--brand-secondary" };

function preview(key: ColorKey, value: string) {
  if (isHex(value)) document.documentElement.style.setProperty(CSS_VAR[key], value);
}

interface ColorValue {
  color: string;
  hex: string;
}

function ColorRow({ label, id, value, onChange }: { label: string; id: ColorKey; value: ColorValue; onChange: (value: ColorValue) => void }) {
  return (
    <label className="block">
      <span className={ui.label}>{label}</span>
      <span className="flex gap-2">
        <input
          type="color"
          value={value.color}
          onChange={(event) => {
            onChange({ color: event.target.value, hex: event.target.value.toUpperCase() });
            preview(id, event.target.value);
          }}
          className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-white p-1"
        />
        <input
          id={id}
          value={value.hex}
          onChange={(event) => {
            const hex = event.target.value;
            if (!isHex(hex)) return onChange({ ...value, hex });
            onChange({ color: hex, hex });
            preview(id, hex);
          }}
          className={ui.input}
        />
      </span>
    </label>
  );
}

export function BrandingTab({ reload }: { reload: Reload }) {
  const studio = currentStudio();
  const settings = getSettings();
  const [logoData, setLogoData] = useState(settings.logoDataUrl || "");
  const [logoChanged, setLogoChanged] = useState(false);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [primaryColor, setPrimaryColor] = useState<ColorValue>({ color: settings.primaryColor, hex: settings.primaryColor });
  const [secondaryColor, setSecondaryColor] = useState<ColorValue>({ color: settings.secondaryColor, hex: settings.secondaryColor });

  useEffect(() => () => applyBrand(getSettings()), []);

  if (!studio) return null;

  const pickLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 800000) {
      toast("Hãy dùng logo dưới 800 KB.", "error");
      return;
    }
    setLogoData(await readAsDataUrl(file));
    setLogoChanged(true);
  };

  const clearLogo = () => {
    setLogoData("");
    setLogoChanged(true);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const primary = primaryColor.hex.trim();
    const secondary = secondaryColor.hex.trim();
    if (!isHex(primary) || !isHex(secondary)) {
      toast("Hãy dùng mã màu hex 6 ký tự, ví dụ #7552F6.", "error");
      return;
    }
    updateSettings({
      primaryColor: primary,
      secondaryColor: secondary,
      slogan: slogan.trim() || "Your Photos. Your Memories.",
      logoDataUrl: logoData,
    });
    toast("Đã lưu thương hiệu");
    reload("branding");
  };

  return (
    <form id="brand-form" className={`${ui.card} max-w-2xl space-y-5 p-5 sm:p-6`} onSubmit={submit}>
      <div>
        <span className={ui.label}>Logo studio</span>
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-line bg-canvas">
            {!logoChanged ? (
              <StudioMark studio={studio} size={56} />
            ) : logoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoData} alt="" className="h-full w-full object-cover" />
            ) : (
              <StudioMark studio={{ name: studio.name }} size={56} />
            )}
          </span>
          <label className={`${ui.secondary} cursor-pointer`}>
            Tải logo lên
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" className="sr-only" onChange={pickLogo} />
          </label>
          {settings.logoDataUrl ? (
            <button type="button" onClick={clearLogo} className="text-sm font-semibold text-mist hover:text-ink">
              Gỡ logo
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-mist">Hiển thị trên album gửi cho khách. Logo vuông hiển thị đẹp nhất. PNG, JPG, WEBP hoặc SVG dưới 800 KB.</p>
      </div>
      <ColorRow label="Màu chính" id="primaryColor" value={primaryColor} onChange={setPrimaryColor} />
      <ColorRow label="Màu phụ" id="secondaryColor" value={secondaryColor} onChange={setSecondaryColor} />
      <label className="block">
        <span className={ui.label}>Khẩu hiệu</span>
        <input id="slogan" value={slogan} onChange={(event) => setSlogan(event.target.value)} className={ui.input} />
        <span className="mt-1.5 block text-xs text-mist">Hiển thị ở chân trang album của khách.</span>
      </label>
      <div className="flex justify-end">
        <button type="submit" className={ui.primary}>
          Lưu thương hiệu
        </button>
      </div>
    </form>
  );
}
