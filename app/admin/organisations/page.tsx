import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrgActionsMenu } from "./_components/OrgActionsMenu";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  allowed_domain: string | null;
  created_at: string;
  organisation_members: { count: number }[];
  projects: { count: number }[];
  modal_maps: { count: number }[];
  components: { count: number }[];
};

function count(arr: { count: number }[]): number {
  return arr?.[0]?.count ?? 0;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OrganisationsPage() {
  const { data: orgs, error } = await supabaseAdmin
    .from("organisations")
    .select(
      "id, name, slug, allowed_domain, created_at, organisation_members(count), projects(count), modal_maps(count), components(count)"
    )
    .order("created_at", { ascending: false })
    .returns<OrgRow[]>();

  return (
    <div className="flex flex-1 flex-col px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white">
            All Organisations
          </h1>
          <p className="mt-1 text-[13px] text-white/60">
            {orgs
              ? `${orgs.length} organisation${orgs.length !== 1 ? "s" : ""}`
              : "Manage all organisations."}
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

      {/* Error state */}
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

      {/* Table */}
      {!error && orgs && orgs.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium w-[220px]">
                  Organisation
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium">
                  Domain
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium text-right">
                  Members
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium text-right">
                  Projects
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium text-right">
                  Modal Maps
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium text-right">
                  Components
                </TableHead>
                <TableHead className="text-white/40 text-[11px] uppercase tracking-widest font-medium">
                  Created
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow
                  key={org.id}
                  className="border-white/[0.06] hover:bg-white/[0.02]"
                >
                  {/* Organisation */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-white">
                        {org.name}
                      </span>
                      <span className="font-mono text-[11px] text-white/35">
                        {org.slug}
                      </span>
                    </div>
                  </TableCell>

                  {/* Domain */}
                  <TableCell className="text-[13px] text-white/50">
                    {org.allowed_domain ? (
                      <span className="font-mono text-[12px]">
                        @{org.allowed_domain}
                      </span>
                    ) : (
                      <span className="text-white/25">—</span>
                    )}
                  </TableCell>

                  {/* Members */}
                  <TableCell className="text-right text-[13px] tabular-nums text-white/60">
                    {count(org.organisation_members)}
                  </TableCell>

                  {/* Projects */}
                  <TableCell className="text-right text-[13px] tabular-nums text-white/60">
                    {count(org.projects)}
                  </TableCell>

                  {/* Modal Maps */}
                  <TableCell className="text-right text-[13px] tabular-nums text-white/60">
                    {count(org.modal_maps)}
                  </TableCell>

                  {/* Components */}
                  <TableCell className="text-right text-[13px] tabular-nums text-white/60">
                    {count(org.components)}
                  </TableCell>

                  {/* Created */}
                  <TableCell className="text-[13px] text-white/40">
                    {formatDate(org.created_at)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <OrgActionsMenu orgId={org.id} orgName={org.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
