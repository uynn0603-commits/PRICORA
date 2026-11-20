"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { previewSrc } from "@/components/albums/preview";
import { AlbumNotFound } from "@/components/albums/AlbumNotFound";
import { TemplatePreview } from "@/components/template-selector/TemplatePreview";
import { TemplateSelector } from "@/components/template-selector/TemplateSelector";
import { PageHeader, SelectField, TextArea, TextField } from "@/components/ui/fields";
import { Icon } from "@/components/ui/Icon";
import { getTemplateMeta, suggestTemplateId } from "@/lib/catalog";
import { cn, daysUntil, occasionLabel, slugify, toISODate } from "@/lib/format";
import { errorMessage } from "@/lib/api";
import { coverSrc } from "@/lib/media";
import { confirmDialog, toast } from "@/lib/overlay";
import { albumLimit, createAlbum, currentStudio, getAlbum, getSettings, isOwner, updateAlbum, uploadCover, type AlbumInput } from "@/lib/store";
import type { Album, AlbumStatus } from "@/lib/types";
import { ui } from "@/lib/ui";
import { useStore, useTitle } from "@/lib/use-store";

const OCCASIONS = ["Wedding", "Pre-wedding", "Personal", "Portrait", "Graduation", "Event", "Other"];

type Step = 1 | 2;
type Errors = Record<string, string>;

interface FormValues {
  name: string;
  customerName: string;
  customerPhone: string;
  occasion: string;
  shootingDate: string;
  description: string;
  password: string;
  expiresAt: string;
  status: AlbumStatus;
  allowDownload: boolean;
  selectionEnabled: boolean;
  selectionLimit: string;
}

interface CoverPayload {
  file: File;
  preview: string;
}

function defaultExpiry() {
  const days = Number(getSettings().defaultExpirationDays) || 90;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

function pin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function initialValues(existing: Album | null): FormValues {
  if (existing) {
    return {
      name: existing.name,
      customerName: existing.customerName,
      customerPhone: existing.customerPhone,
      occasion: existing.occasion || "Wedding",
      shootingDate: existing.shootingDate,
      description: existing.description,
      password: existing.password,
      expiresAt: existing.expiresAt,
      status: existing.status,
      allowDownload: existing.allowDownload !== false,
      selectionEnabled: Boolean(existing.selectionEnabled),
      selectionLimit: existing.selectionLimit ? String(existing.selectionLimit) : "",
    };
  }
  return {
    name: "",
    customerName: "",
    customerPhone: "",
    occasion: "Wedding",
    shootingDate: toISODate(new Date()),
    description: "",
    password: getSettings().defaultPasswordProtection ? pin() : "",
    expiresAt: defaultExpiry(),
    status: "published",
    allowDownload: true,
    selectionEnabled: false,
    selectionLimit: "",
  };
}

function Stepper({ step, editing, onGoto }: { step: Step; editing: boolean; onGoto: (step: Step) => void }) {
  const item = (index: Step, label: string) => {
    const done = index < step;
    const active = index === step;
    return (
      <button type="button" onClick={() => onGoto(index)} className="group flex items-center gap-2.5 text-left">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
            active ? "border-primary bg-primary text-white" : done ? "border-primary bg-primary/10 text-primary" : "border-line text-mist",
          )}
        >
          {done ? <Icon name="check" className="h-3.5 w-3.5" /> : String(index)}
        </span>
        <span className={cn("text-sm font-semibold", index !== step && "text-mist")}>{label}</span>
      </button>
    );
  };
  return (
    <ol className="mb-6 flex items-center gap-3 border-b border-line pb-5" aria-label="Các bước">
      <li>{item(1, "Thông tin album")}</li>
      <li className="h-px w-8 bg-line sm:w-16" aria-hidden="true" />
      <li>{item(2, editing ? "Giao diện" : "Chọn giao diện")}</li>
    </ol>
  );
}

export function AlbumForm({ albumId }: { albumId?: string }) {
  useStore();
  useTitle(albumId ? "Chỉnh sửa album · PICORA" : "Album mới · PICORA");
  const existing = albumId ? getAlbum(albumId) : null;
  if (albumId && !existing) return <AlbumNotFound />;
  return <AlbumFormBody key={existing?.id || "new"} existing={existing} />;
}

function AlbumFormBody({ existing }: { existing: Album | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const form = useRef<HTMLFormElement>(null);
  const editing = Boolean(existing);
  const [values, setValues] = useState<FormValues>(() => initialValues(existing));
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<Step>(() => (searchParams.get("step") === "2" && existing ? 2 : 1));
  const [templateId, setTemplateId] = useState(() => existing?.templateId || suggestTemplateId(values.occasion));
  const [pickedByHand, setPickedByHand] = useState(Boolean(existing));
  const [cover, setCover] = useState<CoverPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const first = Object.keys(errors)[0];
    if (first) document.getElementById(first)?.focus();
  }, [errors]);

  const settings = getSettings();
  const limit = editing ? { ok: true as const } : albumLimit();
  const studioSlug = currentStudio()?.slug || "studio";
  const slugPreview = existing ? `/s/${studioSlug}/${existing.slug || slugify(values.name) || "album"}` : `/s/${studioSlug}/${slugify(values.name) || "album"}`;
  const coverPreview = cover ? cover.preview : existing ? coverSrc(existing, 800) : "";

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    setPickedByHand(true);
  };

  const changeOccasion = (occasion: string) => {
    set("occasion", occasion);
    if (!pickedByHand) setTemplateId(suggestTemplateId(occasion));
  };

  const collect = (forcedStatus?: AlbumStatus) => {
    const input: AlbumInput = {
      name: values.name.trim(),
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      shootingDate: values.shootingDate,
      occasion: values.occasion || "Other",
      description: values.description.trim(),
      password: values.password.trim(),
      expiresAt: values.expiresAt,
      status: forcedStatus || values.status || "published",
      allowDownload: values.allowDownload,
      selectionEnabled: values.selectionEnabled,
      selectionLimit: Math.min(10000, Math.max(0, Math.round(Number(values.selectionLimit) || 0))),
      templateId,
    };
    const found: Errors = {};
    if (!input.name) found.name = "Vui lòng nhập tên album.";
    if (!input.customerName) found.customerName = "Vui lòng nhập tên khách hàng.";
    if (!input.shootingDate) found.shootingDate = "Vui lòng chọn ngày chụp.";
    if (input.customerPhone && input.customerPhone.replace(/\D/g, "").length < 8) {
      found.customerPhone = "Nhập số điện thoại hợp lệ hoặc để trống.";
    }
    return { input, errors: found };
  };

  const validDetails = () => {
    const { errors: found } = collect();
    setErrors(found);
    return !Object.keys(found).length;
  };

  const goto = (target: Step) => {
    if (target === step) return;
    if (target === 2 && !existing && !validDetails()) return;
    setStep(target);
  };

  const onCover = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast("Ảnh bìa chỉ chấp nhận JPG, PNG hoặc WEBP.", "error");
    if (file.size > 25 * 1024 * 1024) return toast("Ảnh bìa tối đa 25 MB.", "error");
    if (cover) URL.revokeObjectURL(cover.preview);
    setCover({ file, preview: URL.createObjectURL(file) });
  };

  const save = async (status?: AlbumStatus) => {
    const { input, errors: found } = collect(status);
    if (Object.keys(found).length) {
      if (step !== 1) setStep(1);
      setErrors(found);
      return;
    }
    setErrors({});
    if (input.status === "published" && input.expiresAt && (daysUntil(input.expiresAt) ?? 0) < 0) {
      const ok = await confirmDialog({
        title: "Ngày hết hạn đã qua",
        message: "Khách hàng sẽ thấy album đã hết hạn cho đến khi bạn gia hạn ngày.",
        confirmText: "Vẫn xuất bản",
      });
      if (!ok) return;
    }
    if (existing && existing.status === "published" && input.status === "draft") {
      const ok = await confirmDialog({
        title: "Chuyển album về bản nháp?",
        message: "Khách hàng sẽ không mở được liên kết cho đến khi bạn xuất bản lại.",
        confirmText: "Lưu bản nháp",
      });
      if (!ok) return;
    }
    setSaving(true);
    let coverKey: string | undefined;
    if (cover) {
      try {
        coverKey = await uploadCover(cover.file);
      } catch (error) {
        setSaving(false);
        return toast(errorMessage(error, "Không tải được ảnh bìa lên. Vui lòng thử lại."), "error");
      }
    }
    if (existing) {
      updateAlbum(existing.id, coverKey ? { ...input, coverId: "", coverKey, coverDataUrl: cover!.preview } : input);
      toast(input.status === "draft" ? "Đã lưu bản nháp" : "Đã lưu album");
      if (input.status === "published") router.push(`/admin/albums/${existing.id}/share?published=1`);
      else router.push("/admin/albums");
      return;
    }
    const result = await createAlbum({ ...input, coverKey });
    setSaving(false);
    if (!result.ok) return toast(result.error, "error");
    const created = result.album;
    if (input.status === "published") {
      toast(`Đã xuất bản album với giao diện ${getTemplateMeta(templateId).name}`);
      router.push(`/admin/albums/${created.id}/share?published=1`);
    } else {
      toast(input.status === "draft" ? "Đã lưu bản nháp. Tiếp theo hãy thêm ảnh." : "Đã lưu album. Tiếp theo hãy thêm ảnh.");
      router.push(`/admin/albums/${created.id}/photos`);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!existing && step === 1) {
      if (validDetails()) {
        setStep(2);
        form.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    void save(values.status);
  };

  const mainLabel = existing ? (
    "Lưu album"
  ) : step === 1 ? (
    <>
      Tiếp tục <Icon name="arrow-right" className="h-4 w-4" />
    </>
  ) : values.status === "published" ? (
    "Xuất bản album"
  ) : (
    "Tạo album"
  );

  return (
    <>
      <PageHeader
        title={editing ? "Chỉnh sửa album" : "Tạo album"}
        description={existing ? existing.name : "Nhập thông tin album, sau đó chọn giao diện hiển thị cho khách hàng."}
      />
      {limit.ok ? null : (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <p>{limit.error}</p>
          {isOwner() ? (
            <Link href="/admin/settings?tab=plan" className={cn(ui.secondary, "shrink-0")}>
              Xem gói dịch vụ
            </Link>
          ) : null}
        </div>
      )}
      <form ref={form} onSubmit={onSubmit} className={cn(ui.card, "p-5 sm:p-6")} noValidate>
        <Stepper step={step} editing={editing} onGoto={goto} />
        <div className={cn("grid gap-5 lg:grid-cols-2", step !== 1 && "hidden")}>
          <div className="space-y-4">
            <TextField
              id="name"
              label="Tên album"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              required
              placeholder="Minh Anh & Hoàng Nam"
              error={errors.name}
            />
            <p className="-mt-2 text-xs text-mist">
              Liên kết cho khách · <span className="font-medium text-ink">{slugPreview}</span>
            </p>
            <TextField
              id="customerName"
              label="Tên khách hàng"
              value={values.customerName}
              onChange={(event) => set("customerName", event.target.value)}
              required
              placeholder="Tên khách hàng"
              error={errors.customerName}
            />
            <TextField
              id="customerPhone"
              label="Số điện thoại"
              value={values.customerPhone}
              onChange={(event) => set("customerPhone", event.target.value)}
              placeholder="Không bắt buộc"
              error={errors.customerPhone}
            />
            <TextField
              id="shootingDate"
              label="Ngày chụp"
              type="date"
              value={values.shootingDate}
              onChange={(event) => set("shootingDate", event.target.value)}
              required
              error={errors.shootingDate}
            />
            <SelectField
              id="occasion"
              label="Dịp chụp"
              value={values.occasion}
              onChange={(event) => changeOccasion(event.target.value)}
              options={OCCASIONS.map((item) => ({ value: item, label: occasionLabel(item) }))}
              error={errors.occasion}
            />
            <TextArea
              id="description"
              label="Mô tả"
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="Đôi lời ngắn hiển thị trên trang album"
              error={errors.description}
            />
          </div>
          <div className="space-y-4">
            <div>
              <span className={ui.label}>Ảnh bìa</span>
              <label className="relative block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-line bg-canvas">
                <span className="flex aspect-[4/3] items-center justify-center text-sm text-mist">
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-2">
                      <Icon name="image" className="h-5 w-5" /> Chọn ảnh bìa
                    </span>
                  )}
                </span>
                <input
                  id="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(event) => void onCover(event.target.files?.[0])}
                />
              </label>
              <p className="mt-1.5 text-xs text-mist">Hiển thị trên thẻ album và phần đầu trang của khách. JPG, PNG hoặc WEBP, tối đa 25 MB.</p>
            </div>
            <TextField
              id="password"
              label="Mật khẩu truy cập"
              value={values.password}
              onChange={(event) => set("password", event.target.value)}
              placeholder="Để trống nếu không cần mật khẩu"
              hint={settings.defaultPasswordProtection && !editing ? "Đã tự điền vì studio đang bật bảo vệ bằng mật khẩu mặc định." : ""}
              error={errors.password}
            />
            <TextField
              id="expiresAt"
              label="Ngày hết hạn"
              type="date"
              value={values.expiresAt}
              onChange={(event) => set("expiresAt", event.target.value)}
              hint="Để trống nếu liên kết không giới hạn thời gian."
              error={errors.expiresAt}
            />
            <SelectField
              id="status"
              label="Trạng thái album"
              value={values.status}
              onChange={(event) => set("status", event.target.value as AlbumStatus)}
              options={[
                { value: "published", label: "Đã xuất bản" },
                { value: "draft", label: "Bản nháp" },
                { value: "hidden", label: "Đã ẩn" },
              ]}
              error={errors.status}
            />
            <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
              <input
                id="allowDownload"
                name="allowDownload"
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
                checked={values.allowDownload}
                onChange={(event) => set("allowDownload", event.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold">Cho phép tải ảnh</span>
                <span className="mt-0.5 block text-xs text-mist">Khách hàng có thể tải từng ảnh hoặc cả album dạng file zip.</span>
              </span>
            </label>
            <div className="rounded-xl border border-line px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  id="selectionEnabled"
                  name="selectionEnabled"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
                  checked={values.selectionEnabled}
                  onChange={(event) => set("selectionEnabled", event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold">Cho khách chọn ảnh</span>
                  <span className="mt-0.5 block text-xs text-mist">Khách thả tim những ảnh muốn chỉnh sửa hoặc in, rồi gửi danh sách kèm ghi chú cho studio.</span>
                </span>
              </label>
              {values.selectionEnabled && (
                <label className="mt-3 flex items-center gap-3 pl-7">
                  <span className="text-sm text-ink">Tối đa</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    inputMode="numeric"
                    className={cn(ui.input, "h-9 w-24")}
                    placeholder="Không giới hạn"
                    value={values.selectionLimit}
                    onChange={(event) => set("selectionLimit", event.target.value)}
                  />
                  <span className="text-sm text-mist">ảnh (để trống nếu không giới hạn)</span>
                </label>
              )}
            </div>
          </div>
        </div>
        <div className={cn(step !== 2 && "hidden")}>
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Chọn giao diện album</h2>
              <p className="mt-1 text-sm text-mist">Mọi giao diện đều dùng cùng ảnh và thông tin. Bạn có thể đổi sau mà không làm thay đổi liên kết của khách.</p>
            </div>
            <p className="text-sm text-mist">
              Đã chọn · <span className="font-semibold text-ink">{getTemplateMeta(templateId).name}</span>
            </p>
          </div>
          <div>
            <TemplateSelector
              selected={templateId}
              suggested={suggestTemplateId(values.occasion)}
              current={existing?.templateId}
              onSelect={chooseTemplate}
              onPreview={setPreviewId}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setStep(1)} className={cn(ui.ghost, (step === 1 || editing) && "hidden", "sm:mr-auto")}>
            <Icon name="arrow-left" className="h-4 w-4" /> Quay lại
          </button>
          <span className="hidden flex-1 sm:block" />
          <button type="button" onClick={() => setPreviewId(templateId)} className={cn(ui.secondary, step === 1 && "hidden")}>
            <Icon name="eye" className="h-4 w-4" /> Xem trước giao diện
          </button>
          <button type="button" disabled={saving} onClick={() => void save("draft")} className={ui.secondary}>
            Lưu bản nháp
          </button>
          <button type="submit" disabled={saving} className={ui.primary}>
            {saving ? "Đang lưu..." : mainLabel}
          </button>
        </div>
      </form>
      {previewId ? (
        <TemplatePreview
          templateId={previewId}
          srcFor={(candidate: string) => (existing ? previewSrc(existing, candidate) : `/templates/${candidate}/demo?embed=1`)}
          selectedId={templateId}
          onSelect={chooseTemplate}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </>
  );
}
