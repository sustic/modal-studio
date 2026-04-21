import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./AppSidebar";

interface Props {
  isSuperadmin: boolean;
  children: React.ReactNode;
}

export function AppShell({ isSuperadmin, children }: Props) {
  return (
    <TooltipProvider>
      <SidebarProvider
        className="flex-1"
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar isSuperadmin={isSuperadmin} variant="inset" />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
