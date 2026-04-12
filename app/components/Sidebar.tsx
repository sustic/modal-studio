"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  isSuperadmin: boolean;
}

export function Sidebar({ isSuperadmin }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-white/[0.06] px-3 py-4 md:flex">
      <SectionLabel>Workspace</SectionLabel>
      <NavItem href="/dashboard" label="Projects" pathname={pathname} />

      {isSuperadmin && (
        <>
          <div className="my-3 h-px bg-white/[0.06]" />
          <SectionLabel>Superadmin</SectionLabel>
          <NavItem href="/admin/organisations" label="All Organisations" pathname={pathname} />
          <NavCTA href="/admin/organisations/new" label="Create Organisation" />
        </>
      )}
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </p>
  );
}

function NavItem({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`flex w-full items-center rounded-md px-2 py-1.5 text-[13px] transition-colors ${
        active
          ? "bg-white/[0.07] text-white/90"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
      }`}
    >
      {label}
    </Link>
  );
}

function NavCTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-1 flex w-full items-center gap-1.5 rounded-md bg-indigo-500/10 px-2 py-1.5 text-[13px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15 hover:text-indigo-300"
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
        <path
          d="M5.5 1.5v8M1.5 5.5h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      {label}
    </Link>
  );
}
