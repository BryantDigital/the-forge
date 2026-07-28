"use client";

import {
  createRosterCsv,
  safeRosterFilename,
  type ExportRosterChild,
} from "../../../../lib/roster-export";

export function RosterActions({
  eventTitle,
  eventDate,
  rosterChildren,
}: {
  eventTitle: string;
  eventDate: string;
  rosterChildren: ExportRosterChild[];
}) {
  return (
    <div className="roster-actions">
      <button
        className="choice"
        type="button"
        onClick={() => window.print()}
      >
        Print roster
      </button>
      <button
        className="choice"
        type="button"
        onClick={() => {
          const blob = new Blob(
            [createRosterCsv(eventTitle, eventDate, rosterChildren)],
            { type: "text/csv;charset=utf-8" },
          );
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = safeRosterFilename(eventTitle);
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }}
      >
        Export CSV
      </button>
    </div>
  );
}
