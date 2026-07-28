"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type RosterChild = {
  id: string;
  name: string;
  age: number;
  notes: string;
  checkedIn: boolean;
};

export function RosterTable({ rosterChildren }: { rosterChildren: RosterChild[] }) {
  const setCheckIn = useMutation(api.events.setChildCheckIn);
  const [rows, setRows] = useState(rosterChildren);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  return (
    <>
      {error && <p className="form-status form-status--error roster-error" role="alert">{error}</p>}
      <div className="table-scroll">
        <table>
          <thead><tr><th>Here</th><th>Child</th><th>Age</th><th>Notes</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((child) => (
              <tr key={child.id}>
                <td>
                  <input
                    className="roster-check"
                    type="checkbox"
                    checked={child.checkedIn}
                    disabled={pendingId === child.id}
                    aria-label={`Check in ${child.name}`}
                    onChange={async (event) => {
                      const checkedIn = event.target.checked;
                      setPendingId(child.id);
                      setError("");
                      setRows((current) =>
                        current.map((row) => row.id === child.id ? { ...row, checkedIn } : row),
                      );
                      try {
                        await setCheckIn({
                          registrationChildId: child.id as Id<"registrationChildren">,
                          checkedIn,
                        });
                      } catch {
                        setRows((current) =>
                          current.map((row) =>
                            row.id === child.id ? { ...row, checkedIn: !checkedIn } : row,
                          ),
                        );
                        setError("Attendance could not be saved. Please try again.");
                      } finally {
                        setPendingId(null);
                      }
                    }}
                  />
                </td>
                <td><strong>{child.name}</strong></td>
                <td>{child.age}</td>
                <td>{child.notes || "—"}</td>
                <td><span className={`tag ${child.checkedIn ? "tag--green" : ""}`}>{child.checkedIn ? "Checked in" : "Registered"}</span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5}>No children are registered for this event yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
