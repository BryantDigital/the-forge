import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";

import { createVolunteerAgreementPdf } from "../lib/volunteer-agreement-pdf.ts";
import {
  VOLUNTEER_AGREEMENT_BODY,
  VOLUNTEER_AGREEMENT_TITLE,
  VOLUNTEER_AGREEMENT_VERSION,
} from "../convex/volunteerAgreement.ts";

test("creates a finalized Forge volunteer agreement PDF", async () => {
  const bytes = await createVolunteerAgreementPdf({
    title: VOLUNTEER_AGREEMENT_TITLE,
    body: VOLUNTEER_AGREEMENT_BODY,
    templateVersion: VOLUNTEER_AGREEMENT_VERSION,
    volunteerName: "Sample Volunteer",
    volunteerEmail: "sample@example.com",
    signatureText: "Sample Volunteer",
    signedAt: Date.UTC(2026, 6, 28, 15, 30),
    documentId: "FORGE-TEST123456",
  });

  const document = await PDFDocument.load(bytes);
  assert.equal(document.getTitle(), VOLUNTEER_AGREEMENT_TITLE);
  assert.equal(document.getAuthor(), "The Forge Christian Ministries");
  assert.equal(document.getPageCount(), 2);
  assert.ok(bytes.length > 3_000);
});
