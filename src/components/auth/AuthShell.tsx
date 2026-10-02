import type { ReactNode } from "react";

export default function AuthShell({
  children,
  aside,
  wide = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-5">
      <div
        className={
          "box-border w-full rounded-card border border-line bg-card p-7 shadow-panel " +
          (wide ? "max-w-md" : "max-w-sm")
        }
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex flex-none items-center gap-2.5">
            <span
              aria-hidden="true"
              className="block size-2.5 rounded-full bg-accent"
            />
            <h1 className="m-0 whitespace-nowrap text-xl font-semibold text-ink">
              Travel Planner
            </h1>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </main>
  );
}
