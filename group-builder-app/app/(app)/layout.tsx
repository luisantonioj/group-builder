import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgConfig } from "@/lib/org-config";
import { OrgProvider } from "@/lib/org-context";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import SyncBar from "@/components/layout/sync-bar";
import CacheWarmer from "@/components/layout/cache-warmer";
import AppShell from "@/components/layout/app-shell";
import { AppProvider } from "@/lib/store";
import { SidebarStateProvider } from "@/lib/sidebar-state";
import { ToastProvider } from "@/components/ui/toast";
import type { OrgContext } from "@/types";

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

  return (
    <OrgProvider org={orgContext}>
      <AppProvider isBld={user.isBldOrg} currentUser={{ id: user.id, name: user.name ?? "User" }}>
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
