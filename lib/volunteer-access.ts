export type VolunteerApprovalEvidence = {
  status: string;
  signedDocumentStorageId?: string | null;
  documentSha256?: string | null;
};

export function hasVolunteerAccessEvidence(
  submissionStatus: string,
  requests: VolunteerApprovalEvidence[],
) {
  return (
    submissionStatus === "approved" &&
    requests.some(
      (request) =>
        request.status === "signed" &&
        Boolean(request.signedDocumentStorageId) &&
        Boolean(request.documentSha256),
    )
  );
}
