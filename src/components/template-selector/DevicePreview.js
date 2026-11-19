import { esc } from "../../utils/format.js";

const PHONE = { width: 414, height: 868 };

// Frames a live page in a browser window or a phone. The page itself runs in an iframe,
// so templates respond to a real viewport width instead of a simulated one. The phone
// always renders a 390px viewport and is scaled down as a whole to fit the screen.
export function devicePreview(src, device = "desktop") {
  if (device === "mobile") {
    return `
      <div data-phone-stage class="flex h-full items-start justify-center overflow-hidden">
        <div data-phone class="relative shrink-0 origin-top rounded-[48px] bg-[#0E0D14] p-3 shadow-2xl ring-1 ring-white/10" style="width:${PHONE.width}px;height:${PHONE.height}px">
          <div class="absolute left-1/2 top-4 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0E0D14]"></div>
          <iframe data-device-frame src="${esc(src)}" title="Xem trước trên điện thoại" class="h-full w-full rounded-[38px] bg-white"></iframe>
        </div>
      </div>`;
  }
  return `
    <div class="mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-[#F3F3F7] px-3">
        <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"></span>
        <span class="ml-3 h-5 flex-1 truncate rounded-md bg-white px-3 text-[11px] leading-5 text-mist">${esc(location.origin + src.replace(/[?&]embed=1/, ""))}</span>
      </div>
      <iframe data-device-frame src="${esc(src)}" title="Xem trước trên máy tính" class="min-h-0 w-full flex-1 bg-white"></iframe>
    </div>`;
}

export function fitPhone(root) {
  const stage = root.querySelector("[data-phone-stage]");
  const phone = root.querySelector("[data-phone]");
  if (!stage || !phone) return;
  const scale = Math.min(1, stage.clientHeight / PHONE.height, stage.clientWidth / PHONE.width);
  phone.style.transform = `scale(${scale})`;
}
