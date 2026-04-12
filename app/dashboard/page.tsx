import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "there";

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Top navigation */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        <div className="flex items-center gap-2">
          {/* Wordmark */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <rect width="18" height="18" rx="4" fill="#5B5BD6" />
            <path
              d="M5 9.5 L7.5 7 L9 9 L10.5 7 L13 9.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-[13px] font-medium tracking-tight text-white">
            Modal Studio
          </span>
        </div>

        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-6 h-6",
            },
          }}
        />
      </header>

      {/* Main layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-white/[0.06] px-3 py-4 md:flex">
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-widest text-white/40">
            Workspace
          </p>
          <SidebarItem label="Projects" active />
          <SidebarItem label="Components" />
          <SidebarItem label="Reports" />
          <div className="my-3 h-px bg-white/[0.06]" />
          <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-widest text-white/40">
            Settings
          </p>
          <SidebarItem label="Members" />
          <SidebarItem label="Preferences" />
        </aside>

        {/* Content */}
        <main className="flex flex-1 flex-col px-8 py-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-[15px] font-semibold text-white">
              Good to see you, {firstName}
            </h1>
            <p className="mt-1 text-[13px] text-white/60">
              Manage your NVH component resonance frequency projects.
            </p>
          </div>

          {/* Section header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-medium text-white/60">
              Projects
            </span>
            <button
              disabled
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/60 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              New project
            </button>
          </div>

          {/* Empty state */}
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-24">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <rect x="2.5" y="4.5" width="13" height="9" rx="1.5" stroke="white" strokeOpacity="0.35" strokeWidth="1.2" />
                <path d="M5.5 8h7M5.5 10.5h4" stroke="white" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-3 text-[13px] font-medium text-white/70">
              Your projects will appear here
            </p>
            <p className="mt-1 max-w-xs text-center text-[12px] text-white/45">
              Create a project to start organizing resonance frequency data for
              your NVH components.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-[13px] transition-colors ${
        active
          ? "bg-white/[0.07] text-white/90"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );
}
