import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import EventsClient from "./events-client";

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as { role?: string };
  if (user.role !== "ADMIN") redirect("/dashboard");

  return <EventsClient isAdmin />;
}
