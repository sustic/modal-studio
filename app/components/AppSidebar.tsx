"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Settings,
  Building2,
  CirclePlus,
  Plus,
  ChevronRight,
  Map,
} from "lucide-react";
import { Collapsible } from "radix-ui";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { NavUser } from "./NavUser";
import { getProjectsForOrg, type SidebarProject } from "@/app/actions/projects";
import {
  getModalMapsForProject,
  type SidebarModalMap,
} from "@/app/actions/modal-maps";

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

/** A single project item that is collapsible and lazy-loads its modal maps. */
function ProjectItem({
  project,
  orgSlug,
  pathname,
}: {
  project: SidebarProject;
  orgSlug: string;
  pathname: string;
}) {
  const projectUrl = `/${orgSlug}/${project.slug}`;
  const isProjectActive =
    pathname === projectUrl || pathname.startsWith(`${projectUrl}/`);

  const [open, setOpen] = React.useState(isProjectActive);
  const [maps, setMaps] = React.useState<SidebarModalMap[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && maps === null && !loading) {
      setLoading(true);
      getModalMapsForProject(orgSlug, project.slug).then((result) => {
        setMaps(result);
        setLoading(false);
      });
    }
  }

  // Auto-load maps when the project is active on first render
  React.useEffect(() => {
    if (isProjectActive && maps === null && !loading) {
      setLoading(true);
      getModalMapsForProject(orgSlug, project.slug).then((result) => {
        setMaps(result);
        setLoading(false);
      });
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Collapsible.Root open={open} onOpenChange={handleOpenChange} asChild>
      <SidebarMenuItem>
        {/* Trigger row: chevron + project name (clicking name navigates, clicking chevron toggles) */}
        <div className="flex items-center">
          <Collapsible.Trigger asChild>
            <button
              className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className="transition-transform duration-200"
                style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
                size={13}
              />
            </button>
          </Collapsible.Trigger>

          <SidebarMenuButton
            asChild
            tooltip={project.name}
            isActive={isProjectActive}
            className="flex-1"
          >
            <Link href={projectUrl}>
              <span className="truncate">{project.name}</span>
            </Link>
          </SidebarMenuButton>
        </div>

        <Collapsible.Content>
          <SidebarMenuSub>
            {loading && (
              <SidebarMenuSubItem>
                <span className="px-2 text-[11px] text-muted-foreground/40">
                  Loading…
                </span>
              </SidebarMenuSubItem>
            )}
            {maps && maps.length === 0 && !loading && (
              <SidebarMenuSubItem>
                <span className="px-2 text-[11px] text-muted-foreground/40 italic">
                  No modal maps
                </span>
              </SidebarMenuSubItem>
            )}
            {maps &&
              maps.map((map) => {
                const mapSlug = map.slug ?? map.id;
                const mapUrl = `/${orgSlug}/${project.slug}/${mapSlug}`;
                return (
                  <SidebarMenuSubItem key={map.id}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === mapUrl}
                    >
                      <Link href={mapUrl}>
                        <Map size={12} />
                        <span className="truncate">{map.name}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
          </SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}

interface Props {
  isSuperadmin: boolean;
}

export function AppSidebar({
  isSuperadmin,
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

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

  const hasMore = projects.length === 6;
  const visibleProjects = projects.slice(0, 5);

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
                {visibleProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    orgSlug={orgSlug}
                    pathname={pathname}
                  />
                ))}

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
