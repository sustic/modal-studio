"use client";

import { useSignUp } from "@clerk/nextjs";
import { useState } from "react";

interface Props {
  token: string;
}

export function InviteActions({ token }: Props) {
  const { signUp } = useSignUp();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeUrl = `/invite/${token}/complete`;

  async function handleGoogle() {
    if (!signUp) return;
    setError(null);
    setGoogleLoading(true);
    const origin = window.location.origin;
    const result = await signUp.sso({
      strategy: "oauth_google",
      redirectUrl: `${origin}/sso-callback`,
      redirectCallbackUrl: `${origin}${completeUrl}`,
    });
    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={!signUp || googleLoading}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87Z"
              fill="#4285F4"
            />
            <path
              d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.58-2a4.8 4.8 0 0 1-7.15-2.52H.94v2.06A8 8 0 0 0 8 16Z"
              fill="#34A853"
            />
            <path
              d="M3.56 9.54A4.8 4.8 0 0 1 3.56 6.46V4.4H.94a8 8 0 0 0 0 7.2l2.62-2.06Z"
              fill="#FBBC05"
            />
            <path
              d="M8 3.2a4.33 4.33 0 0 1 3.07 1.2l2.3-2.3A7.7 7.7 0 0 0 8 0 8 8 0 0 0 .94 4.4l2.62 2.06A4.77 4.77 0 0 1 8 3.2Z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </button>

      {/* Email */}
      <a
        href={`/sign-up?redirect_url=${encodeURIComponent(completeUrl)}`}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
          <path
            d="M1 2.5A1.5 1.5 0 0 1 2.5 1h10A1.5 1.5 0 0 1 14 2.5v.506l-6.5 4.333L1 3.006V2.5Zm0 1.68V12.5A1.5 1.5 0 0 0 2.5 14h10a1.5 1.5 0 0 0 1.5-1.5V4.18l-6.5 4.334L1 4.18Z"
            fill="currentColor"
            fillOpacity={0.7}
          />
        </svg>
        Continue with email
      </a>

      {error && (
        <p className="text-center text-[13px] text-destructive">{error}</p>
      )}
    </div>
  );
}
