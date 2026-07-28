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
          <Link href="/admin/events">Events</Link>
          {viewer?.admin?.role !== "checkin" && (
            <Link href="/admin/volunteers">Volunteers</Link>
          )}
          {viewer?.admin?.role !== "checkin" && (
            <>
              <Link href="/admin/families">Families</Link>
              <Link href="/admin/giving">Giving</Link>
            </>
          )}
        </nav>
        <span className="tag">{role}</span>
      </div>
    </header>
  );
}
