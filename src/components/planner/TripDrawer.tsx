"use client";

import type { KeyboardEvent } from "react";
import type { TripData, ItemSectionKey, ItemData } from "@/lib/types";
import { fmtRange, nightsBetween } from "@/lib/dates";
import { SECTION_DEFS, isScheduled, hostFromUrl } from "@/lib/tripSections";
import type { Editing, FormState } from "@/components/Planner";

export default function TripDrawer({
  trip,
  isMobile,
  editing,
  form,
  onFormChange,
  onClose,
  onStartAdd,
  onStartEdit,
  onCancelForm,
  onSaveForm,
  onDeleteItem,
}: {
  trip: TripData;
  isMobile: boolean;
  editing: Editing;
  form: FormState;
  onFormChange: (f: FormState) => void;
  onClose: () => void;
  onStartAdd: (key: ItemSectionKey) => void;
  onStartEdit: (key: ItemSectionKey, itemId: string, current: FormState) => void;
  onCancelForm: () => void;
  onSaveForm: () => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const bottomSheet = isMobile;

  const drawerClass = bottomSheet
    ? "absolute z-30 bg-white box-border flex flex-col overflow-hidden left-2.5 right-2.5 bottom-2.5 max-h-[78vh] rounded-2xl border border-line shadow-[0_-14px_44px_rgba(28,27,25,0.2)] p-[18px_18px_14px]"
    : "absolute z-30 bg-white box-border flex flex-col overflow-hidden top-3 bottom-3 right-3 w-[min(420px,52vw)] rounded-2xl border border-line shadow-[-18px_0_48px_rgba(28,27,25,0.18)] p-[22px_22px_16px]";

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSaveForm();
    if (e.key === "Escape") onCancelForm();
  }

  return (
    <section className={drawerClass}>
      <header className="flex items-start justify-between gap-3 pb-4 border-b border-line-soft">
        <div>
          <h2 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.015em] text-ink">{trip.label}</h2>
          <div className="text-[13px] text-muted-2">
            {fmtRange(trip.start, trip.end)} · {nightsBetween(trip.start, trip.end)} nights
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[9px] border border-line bg-white cursor-pointer text-ink-soft text-[13px] flex-none hover:bg-hover"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-[22px] pt-[18px] pb-1 overflow-y-auto overflow-x-hidden min-h-0">
        {SECTION_DEFS.map((sec) => {
          const items: ItemData[] = trip[sec.key];
          const scheduledCount = items.filter(isScheduled).length;
          const showForm = editing?.key === sec.key;
          const saveLabel = editing && editing.itemId !== null ? "Save" : "Add";

          return (
            <div key={sec.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2.5">
                <h3 className="m-0 text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">
                  {sec.name}
                </h3>
                <span className="text-[12px] text-muted-3">
                  {scheduledCount}/{items.length} scheduled
                </span>
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-[#fbfaf9] border border-line-soft rounded-[11px] py-2 pl-3 pr-2.5 min-h-[48px] box-border"
                >
                  <button
                    onClick={() => onStartEdit(sec.key, item.id, { t: item.t, url: item.url, cost: item.cost })}
                    title="Edit details"
                    className="flex-1 min-w-0 block text-left bg-transparent border-0 py-[3px] cursor-text"
                  >
                    <span className="block text-[14.5px] text-ink overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.t}
                    </span>
                    <span className="flex items-center gap-2 mt-[3px] min-w-0">
                      <span
                        className="text-[12px] [font-variant-numeric:tabular-nums]"
                        style={{ color: item.cost ? "#56534e" : "#b0aca6" }}
                      >
                        {item.cost || "no cost yet"}
                      </span>
                      <span className="text-[#ddd9d3] text-[11px]">·</span>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[12px] overflow-hidden text-ellipsis whitespace-nowrap"
                          style={{ color: "oklch(0.42 0.16 285)" }}
                        >
                          {hostFromUrl(item.url)}
                        </a>
                      ) : (
                        <span className="text-[12px] text-muted-4">no link yet</span>
                      )}
                    </span>
                  </button>
                  <span
                    className="text-[11px] py-[5px] px-2.5 rounded-full whitespace-nowrap flex-none border-0"
                    style={
                      isScheduled(item)
                        ? { background: "oklch(0.95 0.05 155)", color: "oklch(0.45 0.11 155)" }
                        : { background: "#f4f3f1", color: "#8d8983" }
                    }
                  >
                    {isScheduled(item) ? "Scheduled" : "Incomplete"}
                  </span>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    title="Remove"
                    className="w-7 h-7 flex-none border-0 rounded-lg bg-transparent cursor-pointer text-muted-4 text-[12px] hover:bg-line-soft hover:text-ink-soft"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {showForm && (
                <div className="flex flex-col gap-2 border border-[#ddd9d3] rounded-[11px] p-3 bg-white">
                  <input
                    value={form.t}
                    onChange={(e) => onFormChange({ ...form, t: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder={sec.placeholder}
                    autoFocus
                    className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
                  />
                  <input
                    value={form.url}
                    onChange={(e) => onFormChange({ ...form, url: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder="Booking link (https://…)"
                    className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
                  />
                  <input
                    value={form.cost}
                    onChange={(e) => onFormChange({ ...form, cost: e.target.value })}
                    onKeyDown={handleKeyDown}
                    placeholder="Cost (e.g. €410)"
                    className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
                  />
                  <div className="text-[12px] text-muted-2 leading-[1.4]">
                    Name, link and cost filled → the item is scheduled automatically.
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={onCancelForm}
                      className="h-9 px-3.5 rounded-[9px] border border-line bg-white cursor-pointer text-[13.5px] text-ink-soft hover:bg-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSaveForm}
                      className="h-9 px-4 rounded-[9px] border-0 bg-accent hover:bg-accent-hover text-white cursor-pointer text-[13.5px]"
                    >
                      {saveLabel}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => onStartAdd(sec.key)}
                className="self-start bg-transparent border-0 pt-2 pb-0 cursor-pointer text-[13.5px] text-muted-2 hover:text-ink"
              >
                + Add {sec.name.toLowerCase()}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
