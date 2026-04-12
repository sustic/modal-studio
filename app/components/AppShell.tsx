import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "./Sidebar";

interface Props {
  isSuperadmin: boolean;
  children: React.ReactNode;
}

export function AppShell({ isSuperadmin, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Top navigation */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
        <div className="flex items-center gap-2">
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
            elements: { avatarBox: "w-6 h-6" },
          }}
        />
      </header>

      {/* Body */}
      <div className="flex flex-1">
        <Sidebar isSuperadmin={isSuperadmin} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
