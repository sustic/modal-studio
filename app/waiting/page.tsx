export default function WaitingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden>
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
            <span className="text-[15px] font-semibold text-foreground">Modal Studio</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden className="text-muted-foreground">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2 6.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-[15px] font-semibold text-foreground">
            No organisation yet
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            You don't have access to any organisation yet. Please check your
            email for an invitation.
          </p>
        </div>
      </div>
    </div>
  );
}
