import { auth } from "./auth";

export interface OrgSession {
  userId: string;
  userName: string;
  userRole: string;
  orgId: string;
  orgSlug: string;
  isBldOrg: boolean;
}

// Validates session and extracts org context.
// Returns null (→ 401) if no session or missing orgId.
export async function requireOrgSession(): Promise<OrgSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as {
    id: string;
    name: string;
    role: string;
    orgId?: string;
    orgSlug?: string;
    isBldOrg?: boolean;
  };

  if (!user.orgId) return null;

  return {
    userId:   user.id,
    userName: user.name ?? "User",
    userRole: user.role ?? "SHEPHERD",
    orgId:    user.orgId,
    orgSlug:  user.orgSlug ?? "",
    isBldOrg: user.isBldOrg ?? false,
  };
}
