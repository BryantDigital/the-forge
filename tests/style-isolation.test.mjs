import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const volunteerForm = fs.readFileSync(
  new URL("../app/volunteer/volunteer-form.tsx", import.meta.url),
  "utf8",
);
const volunteerDashboard = fs.readFileSync(
  new URL("../app/serve/volunteer-dashboard.tsx", import.meta.url),
  "utf8",
);
const styles = fs.readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("keeps public application and volunteer portal role cards isolated", () => {
  assert.match(volunteerForm, /className="volunteer-role-card"/);
  assert.match(
    volunteerDashboard,
    /className="volunteer-portal-role-card"/,
  );
  assert.match(styles, /\.volunteer-portal-role-card\s*\{/);
  assert.doesNotMatch(
    volunteerDashboard,
    /className="volunteer-role-card"/,
  );
});
