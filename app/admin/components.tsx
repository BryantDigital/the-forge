"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";

export function AdminHeader() {
  const viewer = useQuery(api.adminAuth.getViewer);
  const role =
    viewer?.admin?.role === "event_manager"
      ? "Events manager"
      : viewer?.admin?.role === "checkin"
        ? "Check-in"
        : "Owner";

  return (
    <header className="admin-header">
      <div className="shell admin-header__inner">
        <Link href="/admin"><img src="/images/forge-logo-white.png" alt="The Forge Admin" /></Link>
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/events/the-forge-september-12">Events</Link>
          <Link href="/admin">Volunteers</Link>
          <Link href="/admin">Communications</Link>
        </nav>
        <span className="tag">{role}</span>
      </div>
    </header>
  );
}
