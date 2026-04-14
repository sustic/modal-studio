"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createModalMap, type CreateModalMapState } from "@/app/actions/modal-maps";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  orgSlug: string;
  projectSlug: string;
}

export function NewModalMapForm({ orgSlug, projectSlug }: Props) {
  const boundAction = createModalMap.bind(null, orgSlug, projectSlug);
  const [state, action, pending] = useActionState<CreateModalMapState, FormData>(
    boundAction,
    null
  );

  const [name, setName] = useState(
    state && !state.success ? (state.fields?.name ?? "") : ""
  );
  const [slug, setSlug] = useState(
    state && !state.success ? (state.fields?.slug ?? "") : ""
  );
  const [description, setDescription] = useState(
    state && !state.success ? (state.fields?.description ?? "") : ""
  );

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    setSlug(toSlug(e.target.value));
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Error banner */}
      {state && !state.success && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {state.error}
        </div>
      )}

      {/* Name + Slug */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required>
          <input
            name="name"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="My Modal Map"
            className={inputClass}
          />
        </Field>
        <Field
          label="Slug"
          required
          hint="Used in URLs — cannot be changed later"
        >
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-modal-map"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="Description">
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of this modal map"
          className={`${inputClass} resize-none`}
        />
      </Field>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create Modal Map"}
        </Button>
        <Link
          href={`/${orgSlug}/${projectSlug}`}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring/30";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-muted-foreground/60">*</span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/50">{hint}</p>}
    </div>
  );
}
