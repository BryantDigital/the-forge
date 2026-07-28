import assert from "node:assert/strict";
import test from "node:test";

import { hasVolunteerAccessEvidence } from "../lib/volunteer-access.ts";

test("requires approved status and a finalized signed document for volunteer access", () => {
  assert.equal(
    hasVolunteerAccessEvidence("approved", [
      {
        status: "signed",
        signedDocumentStorageId: "storage-123",
        documentSha256: "abc123",
      },
    ]),
    true,
  );
  assert.equal(
    hasVolunteerAccessEvidence("pending", [
      {
        status: "signed",
        signedDocumentStorageId: "storage-123",
        documentSha256: "abc123",
      },
    ]),
    false,
  );
  assert.equal(
    hasVolunteerAccessEvidence("approved", [
      {
        status: "pending",
        signedDocumentStorageId: "storage-123",
        documentSha256: "abc123",
      },
    ]),
    false,
  );
  assert.equal(
    hasVolunteerAccessEvidence("approved", [
      {
        status: "signed",
        signedDocumentStorageId: "storage-123",
      },
    ]),
    false,
  );
});
