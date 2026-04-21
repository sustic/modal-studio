"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getProjectTemplates,
  type ComponentType,
  type FrequencyRange,
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

// ── Public API ─────────────────────────────────────────────────────────────────

export type AddComponentData = {
  name: string;
  description: string | null;
  componentType: ComponentType;
  frequencyRanges: FrequencyRange[];
  sourceTemplateId?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (data: AddComponentData) => void;
  orgSlug: string;
  projectSlug: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRange(): RangeField {
  return { id: Math.random().toString(36).slice(2), base_low: "", base_high: "", safe_low: "", safe_high: "" };
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/30";

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

// ── DetailsDrawer ──────────────────────────────────────────────────────────────

export function DetailsDrawer({ open, onClose, onAdd, orgSlug, projectSlug }: Props) {
  const [tab, setTab] = useState<Tab>("new");

  // ── New Component form ───────────────────────────────────────────────────
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [componentType, setComponentType] = useState<ComponentType>("passive");
  const [ranges, setRanges]           = useState<RangeField[]>([makeRange()]);
  const [formError, setFormError]     = useState<string | null>(null);

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

  // Reset form state after the drawer finishes sliding out
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setTab("new");
      setName("");
      setDescription("");
      setComponentType("passive");
      setRanges([makeRange()]);
      setFormError(null);
      setSearch("");
      setSelectedId(null);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  // ── Range helpers ─────────────────────────────────────────────────────────

  function updateRange(id: string, field: keyof RangeField, value: string) {
    setRanges((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  // ── Submit: New Component ─────────────────────────────────────────────────

  function handleSubmitNew(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Component name is required.");
      return;
    }

    const parsed: FrequencyRange[] = [];
    for (const r of ranges) {
      const lo = parseFloat(r.base_low);
      const hi = parseFloat(r.base_high);
      if (isNaN(lo) || isNaN(hi)) {
        setFormError("Base Low and Base High are required for all frequency ranges.");
        return;
      }
      if (lo >= hi) {
        setFormError("Base Low must be less than Base High for each range.");
        return;
      }
      parsed.push({
        base_low:  lo,
        base_high: hi,
        safe_low:  r.safe_low  !== "" ? parseFloat(r.safe_low)  : null,
        safe_high: r.safe_high !== "" ? parseFloat(r.safe_high) : null,
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute inset-y-0 z-20 flex w-[380px] flex-col border-l bg-card shadow-xl transition-[right] duration-300 ease-spring"
      style={{ right: open ? 0 : -380 }}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-[13px] font-semibold">Add Component</span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── New Component ────────────────────────────────────────────── */}
        {tab === "new" && (
          <form id="new-component-form" onSubmit={handleSubmitNew} className="flex flex-col gap-5 p-4">
            {formError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {formError}
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Name *</FieldLabel>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engine Mount"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Description</FieldLabel>
              <textarea
                className={`${inputCls} resize-none`}
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

              {ranges.map((range, i) => (
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

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { field: "base_low",  label: "Base Low (Hz)",  placeholder: "0"    },
                        { field: "base_high", label: "Base High (Hz)", placeholder: "1000" },
                        { field: "safe_low",  label: "Safe Low (Hz)",  placeholder: "Opt." },
                        { field: "safe_high", label: "Safe High (Hz)", placeholder: "Opt." },
                      ] as const
                    ).map(({ field, label, placeholder }) => (
                      <div key={field} className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground/50">{label}</span>
                        <input
                          className={inputCls}
                          type="number"
                          step="any"
                          min="0"
                          value={range[field]}
                          onChange={(e) => updateRange(range.id, field, e.target.value)}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

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
              className={inputCls}
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
        {tab === "new" ? (
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
