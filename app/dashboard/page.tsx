import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { PageHeader } from "@/app/components/PageHeader";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const firstName =
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "there";

  const isSuperadmin = userId === process.env.NEXT_PUBLIC_SUPERADMIN_CLERK_ID;

  return (
    <AppShell isSuperadmin={isSuperadmin}>
      <PageHeader title={`Good to see you, ${firstName}`} />
      <div className="flex flex-1 flex-col px-8 py-8">
        {/* Section header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Projects</span>
          <button
            disabled
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground/50 transition-colors hover:bg-accent hover:text-muted-foreground disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M6 2.5v7M2.5 6h7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New project
          </button>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-24">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect
                x="2.5" y="4.5" width="13" height="9" rx="1.5"
                stroke="currentColor" strokeWidth="1.2"
              />
              <path
                d="M5.5 8h7M5.5 10.5h4"
                stroke="currentColor" strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            Your projects will appear here
          </p>
          <p className="mt-1 max-w-xs text-center text-[12px] text-muted-foreground">
            Create a project to start organizing resonance frequency data for
            your NVH components.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
