import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { fetchAuthQuery } from "../../lib/auth-server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await fetchAuthQuery(api.adminAuth.getViewer).catch(() => null);

  if (!viewer?.user) {
    redirect("/account?returnTo=/admin");
  }

  if (!viewer.admin) {
    redirect("/account?admin=required");
  }

  return children;
}
