"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createOrganisation, type CreateOrgState } from "@/app/actions/organisations";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function NewOrgForm() {
  const [state, action, pending] = useActionState<CreateOrgState, FormData>(
    createOrganisation,
    null
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [allowedDomain, setAllowedDomain] = useState("");
  const [email, setEmail] = useState("");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
    setSlug(toSlug(e.target.value));
  }

  // Success state
  if (state?.success) {
    const inviteUrl = `${window.location.origin}/invite?token=${state.token}`;
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M2.5 7l3 3 6-6"
                stroke="#35a854"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[13px] font-medium text-green-400">
              Organisation created
            </span>
          </div>
          <p className="text-[12px] text-white/50">
            <span className="text-white/70 font-medium">{state.orgName}</span> was created and an owner invitation was sent.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
            Invite link
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/60 font-mono break-all">
              {inviteUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inviteUrl)}
              className="shrink-0 cursor-pointer rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-white/30">
            Share this link with the first user to let them join as owner.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/organisations"
            className="cursor-pointer rounded-md border border-white/[0.08] px-3 py-2 text-[13px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white/80"
          >
            View all organisations
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-md bg-indigo-500/10 px-3 py-2 text-[13px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15 hover:text-indigo-300"
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Error banner */}
      {state && !state.success && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
          {state.error}
        </div>
      )}

      {/* Name + Slug row */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Organisation Name" required>
          <input
            name="name"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="Your Organisation"
            className={inputClass}
          />
        </Field>
        <Field label="Slug" required hint="Used in URLs — auto-generated from name">
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-organisation"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="Description">
        <textarea
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of the organisation"
          className={`${inputClass} resize-none`}
        />
      </Field>

      {/* Allowed domain */}
      <Field label="Allowed Email Domain" hint="Only users with this domain can be invited">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-white/30">
            @
          </span>
          <input
            name="allowed_domain"
            value={allowedDomain}
            onChange={(e) => setAllowedDomain(e.target.value)}
            placeholder="company.com"
            className={`${inputClass} pl-7`}
          />
        </div>
      </Field>

      <div className="h-px bg-white/[0.06]" />

      {/* First user email */}
      <Field label="First User Email" required hint="Will receive an owner invitation">
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className={inputClass}
        />
      </Field>

      {/* Submit */}
      <div className="pt-1">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create Organisation"}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none transition-colors focus:border-white/20 focus:bg-white/[0.05]";

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
      <label className="text-[12px] font-medium text-white/50 uppercase tracking-wider">
        {label}
        {required && <span className="ml-0.5 text-indigo-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}
