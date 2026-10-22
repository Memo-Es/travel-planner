import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** The "Add …" row that ends a list: a dashed square and a muted label. */
export function AddRow({
  label,
  onClick,
  busy = false,
  className,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl py-2.5 pl-2 text-left text-base font-medium text-muted-2 outline-offset-[-2px] transition-colors duration-150 hover:bg-hover hover:text-ink disabled:opacity-60",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center">
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-5 items-center justify-center rounded-md border-2 border-dashed border-stone-300"
          >
            <Plus className="size-3" strokeWidth={2.5} />
          </span>
        )}
      </span>
      {label}
    </button>
  );
}
