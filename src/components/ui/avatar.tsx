import { cn } from "@/lib/utils";
import { initials } from "@/lib/people";

const SIZES = {
  sm: "size-6 text-xs",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
};

/** Initials in a soft accent circle. Decorative: pair it with the name. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
