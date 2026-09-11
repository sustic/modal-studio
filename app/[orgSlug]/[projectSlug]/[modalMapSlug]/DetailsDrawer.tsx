"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getProjectTemplates,
  type ComponentType,
  type FrequencyRange,
  type ModalMapComponent,
  type ProjectTemplate,
} from "@/app/actions/components";

// ── Internal form types ────────────────────────────────────────────────────────

type Tab = "new" | "template";

type RangeField = {
  id: string;
  base_low: string;
  base_high: string;
  safe_low: string;
  safe_high: string;
};

type RangeErrors = {
  base_low?: string;
  base_high?: string;
  safe_low?: string;
  safe_high?: string;
};

type FormErrors = {
  name?: string;
  ranges: RangeErrors[];
};

// ── Public API ─────────────────────────────────────────────────────────────────

export type AddComponentData = {
  name: string;
  description: string | null;
  componentType: ComponentType;
  frequencyRanges: FrequencyRange[];
  sourceTemplateId?: string;
};

interface Props {
  onClose: () => void;
  onAdd: (data: AddComponentData) => void;
  onDelete: (componentId: string) => void;
  orgSlug: string;
  projectSlug: string;
  editingComponent: ModalMapComponent | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRange(): RangeField {
  return { id: Math.random().toString(36).slice(2), base_low: "", base_high: "", safe_low: "", safe_high: "" };
}

const baseInputCls =
  "w-full rounded-md border bg-background px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors";

function inputCls(error?: string) {
  return error
    ? `${baseInputCls} border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30`
    : `${baseInputCls} border-border focus:border-ring focus:ring-1 focus:ring-ring/30`;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="text-[11px] text-destructive">{msg}</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {children}
    </span>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-border">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            "flex-1 py-1.5 text-[13px] transition-colors",
            i > 0 ? "border-l border-border" : "",
            value === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validate(name: string, ranges: RangeField[]): FormErrors {
  const errors: FormErrors = { ranges: ranges.map(() => ({})) };

  if (!name.trim()) {
    errors.name = "Name is required";
  }

  ranges.forEach((r, i) => {
    const err: RangeErrors = {};
    const loRaw = r.base_low.trim();
    const hiRaw = r.base_high.trim();
    const slRaw = r.safe_low.trim();
    const shRaw = r.safe_high.trim();

    const lo = loRaw === "" ? null : parseFloat(loRaw);
    const hi = hiRaw === "" ? null : parseFloat(hiRaw);
    const sl = slRaw === "" ? null : parseFloat(slRaw);
    const sh = shRaw === "" ? null : parseFloat(shRaw);

    // Base Low — required
    if (loRaw === "") {
      err.base_low = "Required";
    } else if (lo === null || isNaN(lo) || lo < 0) {
      err.base_low = "Must be 0 or greater";
    } else if (lo > 6000) {
      err.base_low = "Must be 6000 or less";
    }

    // Base High — optional; if filled: must be > base_low and <= 6000
    if (hiRaw !== "") {
      if (hi === null || isNaN(hi)) {
        err.base_high = "Invalid value";
      } else if (hi > 6000) {
        err.base_high = "Must be 6000 or less";
      } else if (lo !== null && !isNaN(lo) && hi <= lo) {
        err.base_high = "Must be greater than Base Low";
      }
    }

    // Safe Low — optional; if filled: must be >= 0, and Safe High must also be filled
    if (slRaw !== "") {
      if (sl === null || isNaN(sl) || sl < 0) {
        err.safe_low = "Must be 0 or greater";
      } else if (shRaw === "") {
        err.safe_low = "Safe High is also required";
      }
    }

    // Safe High — optional; if filled: must be > safe_low, and Safe Low must also be filled
    if (shRaw !== "") {
      if (slRaw === "") {
        err.safe_high = "Safe Low is also required";
      } else if (sh !== null && !isNaN(sh) && sl !== null && !isNaN(sl) && sh <= sl) {
        err.safe_high = "Must be greater than Safe Low";
      }
    }

    // Safe range must contain base range (all four filled, no prior safe errors)
    if (
      lo !== null && hi !== null && sl !== null && sh !== null &&
      !isNaN(lo) && !isNaN(hi) && !isNaN(sl) && !isNaN(sh) &&
      !err.safe_low && !err.safe_high
    ) {
      if (sl > lo || sh < hi) {
        err.safe_low = "Safe range should contain the base range";
      }
    }

    errors.ranges[i] = err;
  });

  return errors;
}

function hasErrors(errors: FormErrors): boolean {
  if (errors.name) return true;
  return errors.ranges.some((r) => r.base_low || r.base_high || r.safe_low || r.safe_high);
}

// ── DetailsDrawer ──────────────────────────────────────────────────────────────

export function DetailsDrawer({ onClose, onAdd, onDelete, orgSlug, projectSlug, editingComponent }: Props) {
  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
    setTimeout(onClose, 200);
  }

  const [tab, setTab] = useState<Tab>("new");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // ── New Component form ───────────────────────────────────────────────────
  const [name, setName]               = useState(editingComponent?.name ?? "");
  const [description, setDescription] = useState(editingComponent?.description ?? "");
  const [componentType, setComponentType] = useState<ComponentType>(editingComponent?.component_type ?? "passive");
  const [ranges, setRanges]           = useState<RangeField[]>(() => {
    if (editingComponent && editingComponent.frequency_ranges.length > 0) {
      return editingComponent.frequency_ranges.map((r) => ({
        id:        Math.random().toString(36).slice(2),
        base_low:  String(r.base_low),
        base_high: r.base_high != null ? String(r.base_high) : "",
        safe_low:  r.safe_low  != null ? String(r.safe_low)  : "",
        safe_high: r.safe_high != null ? String(r.safe_high) : "",
      }));
    }
    return [makeRange()];
  });
  const [submitted, setSubmitted]     = useState(false);
  const [errors, setErrors]           = useState<FormErrors>({ ranges: [] });

  // ── Template tab ─────────────────────────────────────────────────────────
  const [templates, setTemplates]           = useState<ProjectTemplate[] | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [search, setSearch]                 = useState("");
  const [selectedId, setSelectedId]         = useState<string | null>(null);

  // Lazy-load templates the first time the tab is opened
  useEffect(() => {
    if (tab === "template" && templates === null && !templatesLoading) {
      setTemplatesLoading(true);
      getProjectTemplates(orgSlug, projectSlug).then((result) => {
        setTemplates(result);
        setTemplatesLoading(false);
      });
    }
  }, [tab, templates, templatesLoading, orgSlug, projectSlug]);

  // ── Range helpers ─────────────────────────────────────────────────────────

  function updateRange(id: string, field: keyof RangeField, value: string) {
    setRanges((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  // ── Submit: New Component ─────────────────────────────────────────────────

  function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault();
    if (editingComponent) return;
    setSubmitted(true);

    const errs = validate(name, ranges);
    setErrors(errs);
    if (hasErrors(errs)) return;

    // Build parsed ranges — include any range where base_low is valid.
    // base_high is optional; null means a single-point frequency.
    const parsed: FrequencyRange[] = [];
    for (const r of ranges) {
      const lo = parseFloat(r.base_low);
      if (isNaN(lo)) continue;
      parsed.push({
        base_low:  lo,
        base_high: r.base_high.trim() !== "" ? parseFloat(r.base_high) : null,
        safe_low:  r.safe_low.trim()  !== "" ? parseFloat(r.safe_low)  : null,
        safe_high: r.safe_high.trim() !== "" ? parseFloat(r.safe_high) : null,
      });
    }

    onAdd({
      name: name.trim(),
      description: description.trim() || null,
      componentType,
      frequencyRanges: parsed,
    });
  }

  // ── Submit: From Template ─────────────────────────────────────────────────

  function handleSubmitTemplate() {
    if (!selectedId || !templates) return;
    const tmpl = templates.find((t) => t.id === selectedId);
    if (!tmpl) return;
    onAdd({
      name: tmpl.name,
      description: tmpl.description,
      componentType: tmpl.component_type,
      frequencyRanges: tmpl.frequency_ranges,
      sourceTemplateId: tmpl.id,
    });
  }

  const filteredTemplates = (templates ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Derived: current errors (only shown after first submit attempt) ────────
  const liveErrors: FormErrors = submitted ? validate(name, ranges) : { ranges: ranges.map(() => ({})) };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        "fixed inset-y-0 right-0 z-20 flex w-[380px] flex-col border-l bg-card shadow-xl duration-200",
        closing
          ? "animate-out slide-out-to-right"
          : "animate-in slide-in-from-right",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-[13px] font-semibold">
          {editingComponent ? editingComponent.name : "Add Component"}
        </span>
        <button
          onClick={dismiss}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs — hidden in edit mode */}
      {!editingComponent && (
        <div className="flex shrink-0 border-b">
          {(["new", "template"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 px-4 py-2.5 text-[12px] font-medium transition-colors",
                tab === t
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t === "new" ? "New Component" : "From Template"}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── New Component / Edit Component ───────────────────────────── */}
        {(editingComponent || tab === "new") && (
          <form id="new-component-form" onSubmit={handleSubmitNew} className="flex flex-col gap-5 p-4">

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Name *</FieldLabel>
              <input
                className={inputCls(liveErrors.name)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engine Mount"
                autoFocus
              />
              <FieldError msg={liveErrors.name} />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <textarea
                className={`${inputCls(undefined)} resize-none`}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>

            {/* Component Type */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Component Type</FieldLabel>
              <SegmentedControl
                value={componentType}
                onChange={(v) => setComponentType(v as ComponentType)}
                options={[
                  { value: "passive", label: "Passive" },
                  { value: "active",  label: "Active"  },
                ]}
              />
            </div>

            {/* Frequency Ranges */}
            <div className="flex flex-col gap-3">
              <FieldLabel>Frequency Ranges</FieldLabel>

              {ranges.map((range, i) => {
                const rangeErr = liveErrors.ranges[i] ?? {};
                return (
                  <div key={range.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground/50">Range {i + 1}</span>
                      {ranges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRanges((rs) => rs.filter((r) => r.id !== range.id))}
                          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove range"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                      {(
                        [
                          { field: "base_low",  label: "Base Low (Hz)",  placeholder: "0"    },
                          { field: "base_high", label: "Base High (Hz)", placeholder: "Opt." },
                          { field: "safe_low",  label: "Safe Low (Hz)",  placeholder: "Opt." },
                          { field: "safe_high", label: "Safe High (Hz)", placeholder: "Opt." },
                        ] as const
                      ).map(({ field, label, placeholder }) => {
                        const fieldErr = rangeErr[field];
                        return (
                          <div key={field} className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground/50">{label}</span>
                            <input
                              className={inputCls(fieldErr)}
                              type="number"
                              step="any"
                              min="0"
                              value={range[field]}
                              onChange={(e) => updateRange(range.id, field, e.target.value)}
                              placeholder={placeholder}
                            />
                            <FieldError msg={fieldErr} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setRanges((rs) => [...rs, makeRange()])}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <Plus size={12} />
                Add frequency range
              </button>
            </div>
          </form>
        )}

        {/* ── From Template ─────────────────────────────────────────────── */}
        {tab === "template" && (
          <div className="flex flex-col gap-3 p-4">
            <input
              className={inputCls(undefined)}
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {templatesLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={16} className="animate-spin text-muted-foreground/40" />
              </div>
            )}

            {!templatesLoading && templates !== null && templates.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-[13px] italic text-muted-foreground/50">No templates yet.</p>
                <p className="mt-1 text-[12px] text-muted-foreground/35">
                  Create components and save them as templates.
                </p>
              </div>
            )}

            {!templatesLoading && filteredTemplates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {filteredTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedId((id) => (id === tmpl.id ? null : tmpl.id))}
                    className={[
                      "flex flex-col gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                      selectedId === tmpl.id
                        ? "border-foreground/30 bg-accent"
                        : "border-border hover:bg-accent/40",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-medium">{tmpl.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/50">
                        {tmpl.frequency_ranges.length}{" "}
                        {tmpl.frequency_ranges.length === 1 ? "range" : "ranges"}
                      </span>
                    </div>
                    {tmpl.description && (
                      <span className="line-clamp-1 text-[12px] text-muted-foreground/60">
                        {tmpl.description}
                      </span>
                    )}
                    <span className="mt-0.5 text-[10px] capitalize text-muted-foreground/40">
                      {tmpl.component_type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t p-4">
        {editingComponent ? (
          confirmingDelete ? (
            <div className="flex flex-col gap-3">
              <p className="text-center text-[12px] text-muted-foreground">
                Delete{" "}
                <span className="font-semibold text-foreground">{editingComponent.name}</span>?{" "}
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete(editingComponent.id)}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Save Changes
              </Button>
            </div>
          )
        ) : tab === "new" ? (
          <Button
            type="submit"
            form="new-component-form"
            variant="outline"
            size="sm"
            className="w-full"
          >
            Add Component
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!selectedId}
            onClick={handleSubmitTemplate}
          >
            Add Selected
          </Button>
        )}
      </div>
    </div>
  );
}
