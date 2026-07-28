export type ExportRosterChild = {
  name: string;
  age: number;
  notes: string;
  checkedIn: boolean;
  isFirstTime?: boolean;
};

export function createRosterCsv(
  eventTitle: string,
  eventDate: string,
  children: ExportRosterChild[],
) {
  const rows = [
    ["The Forge event", eventTitle],
    ["Event date", eventDate],
    ["Generated", new Date().toISOString()],
    [],
    ["Child", "Age", "First time", "Allergies / notes", "Attendance"],
    ...children.map((child) => [
      child.name,
      String(child.age),
      child.isFirstTime ? "Yes" : "No",
      child.notes,
      child.checkedIn ? "Checked in" : "Registered",
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function safeRosterFilename(eventTitle: string) {
  const base = eventTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "forge-event"}-child-roster.csv`;
}

function csvCell(value: string) {
  let safe = String(value ?? "");
  if (/^[=+\-@]/.test(safe)) {
    safe = `'${safe}`;
  }
  return `"${safe.replace(/"/g, '""')}"`;
}
