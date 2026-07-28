import assert from "node:assert/strict";
import test from "node:test";

import {
  createRosterCsv,
  safeRosterFilename,
} from "../lib/roster-export.ts";

test("exports the authorized child roster as spreadsheet-safe CSV", () => {
  const csv = createRosterCsv("Forge August Event", "August 15, 2026", [
    {
      name: "Caleb Smith",
      age: 12,
      notes: 'Peanut allergy, carries "EpiPen"',
      checkedIn: true,
    },
    {
      name: "=HYPERLINK(\"bad\")",
      age: 10,
      notes: "",
      checkedIn: false,
    },
  ]);

  assert.match(csv, /"Caleb Smith","12","No","Peanut allergy, carries ""EpiPen""","Checked in"/);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"Registered"/);
});

test("creates a stable roster filename", () => {
  assert.equal(
    safeRosterFilename("The Forge — August 15!"),
    "the-forge-august-15-child-roster.csv",
  );
});
