import { cn } from "@/lib/format";

export interface BarDatum {
  label: string;
  value: number;
  display: string;
}

export function BarChart({ series }: { series: BarDatum[] }) {
  const max = Math.max(...series.map((item) => item.value), 1);
  return (
    <div>
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {series.map((item, index) => {
          const height = item.value <= 0 ? 4 : Math.max(10, Math.round((item.value / max) * 140));
          const current = index === series.length - 1;
          const tone = !item.value ? "bg-line" : current ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/45";
          return (
            <div key={index} className="group flex h-full flex-1 items-end justify-center" title={item.display}>
              <div className="relative w-full max-w-[36px]">
                <span
                  className={cn(
                    "pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-ink",
                    !current && "opacity-0 transition group-hover:opacity-100",
                  )}
                >
                  {item.display}
                </span>
                <div className={`w-full rounded-md transition ${tone}`} style={{ height: `${height}px` }}></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {series.map((item, index) => (
          <div key={index} className="flex-1 truncate text-center text-[11px] font-medium text-mist">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
