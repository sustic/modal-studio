import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PageHeader } from "@/app/components/PageHeader";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  modal_maps: { count: number }[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function count(arr: { count: number }[]): number {
  return arr?.[0]?.count ?? 0;
}

export default async function ProjectsPage({ params }: Props) {
  const { orgSlug } = await params;
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  // Get org
  const { data: org } = await supabaseAdmin
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) redirect("/waiting");

  // Verify membership
  const { data: membership } = await supabaseAdmin
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", org.id)
    .eq("clerk_user_id", userId)
    .single();

  if (!membership) redirect("/waiting");

  // Fetch projects with counts
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("id, name, slug, description, created_by, created_at, updated_at, modal_maps(count)")
    .eq("organisation_id", org.id)
    .order("updated_at", { ascending: false })
    .returns<Project[]>();

  return (
    <>
      <PageHeader title="Projects" />
      <div className="flex flex-1 flex-col px-8 py-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects ?? []).map((project) => (
            <Link
              key={project.id}
              href={`/${orgSlug}/${project.slug}`}
              className="group block"
            >
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold leading-snug">
                    {project.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pb-4">
                  {project.description ? (
                    <p className="line-clamp-2 text-[13px] text-muted-foreground">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground/40 italic">
                      No description
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                        <path d="M3.5 5.5h5M3.5 7.5h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                      </svg>
                      {count(project.modal_maps)} modal {count(project.modal_maps) === 1 ? "map" : "maps"}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-3">
                  <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>Edited {formatDate(project.updated_at)}</span>
                    {project.created_by && (
                      <span className="truncate pl-2 text-right">
                        by {project.created_by}
                      </span>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}

          {/* Inline create card */}
          <Link href={`/${orgSlug}/projects/new`} className="group block">
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-medium">New Project</span>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
