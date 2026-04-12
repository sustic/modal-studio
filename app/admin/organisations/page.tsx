import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Org = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  allowed_domain: string | null;
  created_at: string;
  organisation_members: { count: number }[];
};

export default async function OrganisationsPage() {
  const { data: orgs, error } = await supabaseAdmin
    .from("organisations")
    .select("*, organisation_members(count)")
    .order("created_at", { ascending: false })
    .returns<Org[]>();

  return (
    <div className="flex flex-1 flex-col px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white">
            All Organisations
          </h1>
          <p className="mt-1 text-[13px] text-white/60">
            {orgs ? `${orgs.length} organisation${orgs.length !== 1 ? "s" : ""}` : "Manage all organisations."}
          </p>
        </div>
        <Link
          href="/admin/organisations/new"
          className="flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-3 py-1.5 text-[13px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15 hover:text-indigo-300"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path
              d="M5.5 1.5v8M1.5 5.5h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Create Organisation
        </Link>
      </div>

      {/* Error state — migration probably not run yet */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-400">
          Could not load organisations: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!error && orgs?.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-24">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect
                x="2" y="3" width="14" height="12" rx="2"
                stroke="white" strokeOpacity="0.35" strokeWidth="1.2"
              />
              <path
                d="M6 7h6M6 10h4"
                stroke="white" strokeOpacity="0.35" strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-3 text-[13px] font-medium text-white/70">
            No organisations yet
          </p>
          <p className="mt-1 text-[12px] text-white/45">
            Create your first organisation to get started.
          </p>
          <Link
            href="/admin/organisations/new"
            className="mt-4 rounded-md bg-indigo-500/10 px-3 py-1.5 text-[13px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15 hover:text-indigo-300"
          >
            Create Organisation
          </Link>
        </div>
      )}

      {/* Org list */}
      {!error && orgs && orgs.length > 0 && (
        <div className="flex flex-col gap-2">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgCard({ org }: { org: Org }) {
  const memberCount = org.organisation_members?.[0]?.count ?? 0;
  const createdAt = new Date(org.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-colors hover:bg-white/[0.04]">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-white">{org.name}</span>
          <span className="rounded px-1.5 py-0.5 text-[11px] text-white/35 bg-white/[0.04] font-mono">
            {org.slug}
          </span>
          {org.allowed_domain && (
            <span className="rounded px-1.5 py-0.5 text-[11px] text-white/35 bg-white/[0.04]">
              @{org.allowed_domain}
            </span>
          )}
        </div>
        {org.description && (
          <p className="text-[12px] text-white/45">{org.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-[12px] text-white/35 shrink-0 ml-4">
        <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
        <span>{createdAt}</span>
      </div>
    </div>
  );
}
