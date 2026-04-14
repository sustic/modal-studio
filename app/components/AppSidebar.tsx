"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, Users, Settings, Building2, CirclePlus, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { getProjectsForOrg, type SidebarProject } from "@/app/actions/projects";

// First path segments that are never an org slug
const NON_ORG_SEGMENTS = new Set([
  "admin", "dashboard", "sign-in", "sign-up",
  "invite", "waiting", "sso-callback", "",
]);

function ModalStudioLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden>
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
  );
}

const navWorkspace = [
  { title: "Members", url: "/members", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

const navAdmin = [
  { title: "All Organisations", url: "/admin/organisations", icon: Building2 },
  { title: "Create Organisation", url: "/admin/organisations/new", icon: CirclePlus },
] as const;

function isNavActive(pathname: string, url: string): boolean {
  if (url === "/admin/organisations") {
    return (
      pathname.startsWith("/admin/organisations") &&
      pathname !== "/admin/organisations/new"
    );
  }
  return pathname === url;
}

interface Props {
  isSuperadmin: boolean;
}

export function AppSidebar({
  isSuperadmin,
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Derive org slug from the first path segment
  const firstSegment = pathname.split("/")[1] ?? "";
  const orgSlug = NON_ORG_SEGMENTS.has(firstSegment) ? null : firstSegment;

  const [projects, setProjects] = React.useState<SidebarProject[]>([]);

  React.useEffect(() => {
    if (!orgSlug) {
      setProjects([]);
      return;
    }
    getProjectsForOrg(orgSlug).then(setProjects);
  }, [orgSlug]);

  // We fetched up to 6; if we got 6, there are more than 5
  const hasMore = projects.length === 6;
  const visibleProjects = projects.slice(0, 5);

  // Derive the logo href: go to org projects if in org context, else root
  const logoHref = orgSlug ? `/${orgSlug}/projects` : "/";

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={logoHref}>
                <ModalStudioLogo />
                <span className="text-base font-semibold">Modal Studio</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Projects (org context only) ── */}
        {orgSlug && (
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleProjects.map((project) => {
                  const url = `/${orgSlug}/${project.slug}`;
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton
                        asChild
                        tooltip={project.name}
                        isActive={pathname === url || pathname.startsWith(`${url}/`)}
                      >
                        <Link href={url}>
                          <Folder />
                          <span>{project.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {hasMore && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="View all projects"
                      isActive={pathname === `/${orgSlug}/projects`}
                    >
                      <Link
                        href={`/${orgSlug}/projects`}
                        className="text-muted-foreground"
                      >
                        <span className="ml-0.5 text-[11px]">···</span>
                        <span>View all</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {/* New Project */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="New Project"
                    isActive={pathname === `/${orgSlug}/projects/new`}
                  >
                    <Link href={`/${orgSlug}/projects/new`}>
                      <Plus />
                      <span>New Project</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── Workspace ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navWorkspace.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isNavActive(pathname, item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Superadmin ── */}
        {isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Superadmin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isNavActive(pathname, item.url)}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
