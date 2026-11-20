import { cn, initials } from "@/lib/format";

// Account photo, or the name's initials on the brand colour when there is none.
export function UserAvatar({
  user,
  className = "h-9 w-9 text-xs",
  tone = "solid",
}: {
  user: { name?: string; avatarUrl?: string } | null | undefined;
  className?: string;
  tone?: "solid" | "soft";
}) {
  const base = cn("grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold", className);
  if (user?.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className={cn(base, "bg-canvas object-cover")} />;
  }
  return <span className={cn(base, tone === "solid" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>{initials(user?.name || "")}</span>;
}
