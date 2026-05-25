import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgConfig } from "@/lib/org-config";
import { prisma } from "@/lib/prisma";
import { OrgProvider } from "@/lib/org-context";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import SyncBar from "@/components/layout/sync-bar";
import CacheWarmer from "@/components/layout/cache-warmer";
import AppShell from "@/components/layout/app-shell";
import { AppProvider } from "@/lib/store";
import { SidebarStateProvider } from "@/lib/sidebar-state";
import { ToastProvider } from "@/components/ui/toast";
import type { OrgContext, Event } from "@/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as {
    id: string;
    name: string;
    role: string;
    orgId: string;
    orgSlug: string;
    orgName: string;
    isBldOrg: boolean;
  };

  const orgConfig = await getOrgConfig(user.orgId, user.isBldOrg);

  const orgContext: OrgContext = {
    orgId:   user.orgId,
    orgSlug: user.orgSlug,
    orgName: user.orgName,
    isBld:   user.isBldOrg,
    config:  orgConfig,
  };

  // Load the active or most-recent event for this org
  let initialEvent: Event | null = null;
  try {
    const dbEvent = await prisma.event.findFirst({
      where: { orgId: user.orgId, isActive: true },
      orderBy: { createdAt: "desc" },
    }) ?? await prisma.event.findFirst({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
    });
    if (dbEvent) {
      initialEvent = {
        id:                   dbEvent.id,
        name:                 dbEvent.name,
        isActive:             dbEvent.isActive,
        featureVisualizer:    dbEvent.featureVisualizer,
        featureRoomAssignment: dbEvent.featureRoomAssignment,
        createdAt:            dbEvent.createdAt.toISOString(),
      };
    }
  } catch {
    // DB not configured — initialEvent stays null, store falls back to mock in dev
  }

  // Admins with no events must create one first (onboarding flow)
  if (!initialEvent && user.role === "ADMIN") {
    redirect("/events/setup?onboarding=true");
  }

  return (
    <OrgProvider org={orgContext}>
      <AppProvider initialEvent={initialEvent} currentUser={{ id: user.id, name: user.name ?? "User" }}>
        <ToastProvider>
          <SidebarStateProvider>
            <div className="app-shell">
              <Sidebar
                user={{
                  name: user.name ?? "User",
                  role: user.role ?? "SHEPHERD",
                }}
              />
              <AppShell>
                <Topbar />
                <main
                  className="app-main"
                  style={{ flex: 1, paddingBottom: "calc(var(--space-xl) + 28px)" }}
                >
                  {children}
                </main>
                <SyncBar />
              </AppShell>
            </div>
          </SidebarStateProvider>
          <CacheWarmer />
        </ToastProvider>
      </AppProvider>
    </OrgProvider>
  );
}
