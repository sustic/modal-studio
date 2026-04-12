import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");
  if (userId !== process.env.NEXT_PUBLIC_SUPERADMIN_CLERK_ID) redirect("/dashboard");

  return <AppShell isSuperadmin={true}>{children}</AppShell>;
}
