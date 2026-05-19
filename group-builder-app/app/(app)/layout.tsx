import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import SyncBar from "@/components/layout/sync-bar";
import CacheWarmer from "@/components/layout/cache-warmer";
import AppShell from "@/components/layout/app-shell";
import { AppProvider } from "@/lib/store";
import { SidebarStateProvider } from "@/lib/sidebar-state";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppProvider>
      <ToastProvider>
        <SidebarStateProvider>
          <div className="app-shell">
            <Sidebar
              user={{
                name: session.user?.name ?? "Shepherd",
                role: (session.user as { role?: string })?.role ?? "SHEPHERD",
              }}
            />
            <AppShell>
              <Topbar
                user={{
                  name: session.user?.name ?? "Shepherd",
                  email: session.user?.email ?? "",
                  role: (session.user as { role?: string })?.role ?? "SHEPHERD",
                }}
              />
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
  );
}
