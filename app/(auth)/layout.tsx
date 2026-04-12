export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="text-xl font-semibold tracking-tight text-zinc-900">
          Modal Studio
        </span>
        <span className="text-sm text-zinc-500">
          NVH resonance frequency management
        </span>
      </div>
      {children}
    </div>
  );
}
