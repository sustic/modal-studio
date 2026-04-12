---
name: Modal Studio project context
description: Core project info — what it is, tech stack, auth setup, and breaking Next.js 16 changes
type: project
---

Modal Studio is a SaaS web app for NVH (noise, vibration, harshness) engineers to manage component resonance frequencies, replacing Excel-based workflows.

**Tech stack:** Next.js 16, React 19, Tailwind CSS v4, Supabase (database + auth backend), Clerk (user authentication)

**Role-based access:** viewers, editors, project managers

**Design aesthetic:** Clean, minimal, similar to Linear.app

**Why:** Replaces Excel workflows for NVH engineers managing component resonance frequencies.

**How to apply:** Keep UI minimal (zinc/white palette, tight typography, no decorative chrome). Prioritize data-dense layouts.

## Breaking Next.js 16 change: `middleware` → `proxy`

In Next.js 16, the `middleware.ts` file convention is **deprecated and renamed to `proxy.ts`**. The exported function must be named `proxy` (not `middleware` or `default`). This is a breaking change from all prior Next.js versions.

- File: `proxy.ts` at project root
- Export: `export const proxy = clerkMiddleware(...)`  
- Config export still uses `matcher` same as before

**How to apply:** Always use `proxy.ts` with `export const proxy =` — never `middleware.ts` or `export default` for this file.

## Auth setup

- Clerk (`@clerk/nextjs@7.0.12`) is installed and configured
- `proxy.ts` uses `clerkMiddleware` + `createRouteMatcher` to protect all routes except `/sign-in` and `/sign-up`
- `ClerkProvider` wraps the root layout in `app/layout.tsx`
- Auth pages at `app/(auth)/sign-in/[[...sign-in]]/page.tsx` and `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- After sign-in/up → `/dashboard`
- Root `/` redirects: authenticated → `/dashboard`, unauthenticated → `/sign-in`
