import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Shepherd Login",
      credentials: {
        email:    { label: "Email",        type: "email" },
        password: { label: "Password",     type: "password" },
        orgSlug:  { label: "Organization", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const slug = credentials.orgSlug?.trim() || "";

        try {
          // Resolve org first (required when DB is available)
          const org = await prisma.organization.findUnique({
            where: { slug: slug || "bld-youth-ministry" },
            include: { config: true },
          });
          if (!org) return null;

          const user = await prisma.user.findFirst({
            where: { email: credentials.email, orgId: org.id },
          });
          if (!user) return null;

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;

          return {
            id:       user.id,
            email:    user.email,
            name:     user.name,
            role:     user.role,
            orgId:    org.id,
            orgSlug:  org.slug,
            orgName:  org.name,
            isBldOrg: org.isBld,
          };
        } catch {
          // DB not configured — allow demo login in development
          if (process.env.NODE_ENV === "development") {
            const isBldDemo =
              credentials.email    === "admin@bld.ph" &&
              credentials.password === "shepherd123"   &&
              (slug === "" || slug === "bld-youth-ministry");

            if (isBldDemo) {
              return {
                id:       "demo-admin",
                email:    "admin@bld.ph",
                name:     "Head Shepherd",
                role:     "ADMIN",
                orgId:    "org-bld",
                orgSlug:  "bld-youth-ministry",
                orgName:  "BLD Youth Ministry",
                isBldOrg: true,
              };
            }
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.role     = (user as { role?: string }).role     ?? "SHEPHERD";
        token.orgId    = (user as { orgId?: string }).orgId   ?? "org-bld";
        token.orgSlug  = (user as { orgSlug?: string }).orgSlug  ?? "bld-youth-ministry";
        token.orgName  = (user as { orgName?: string }).orgName  ?? "BLD Youth Ministry";
        token.isBldOrg = (user as { isBldOrg?: boolean }).isBldOrg ?? true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id       = token.id       as string;
        session.user.role     = token.role     as string;
        session.user.orgId    = token.orgId    as string;
        session.user.orgSlug  = token.orgSlug  as string;
        session.user.orgName  = token.orgName  as string;
        session.user.isBldOrg = token.isBldOrg as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

// Convenience — use in Server Components & API routes
export function auth() {
  return getServerSession(authOptions);
}
