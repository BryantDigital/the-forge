import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

type AgreementPdfInput = {
  title: string;
  body: string;
  templateVersion: string;
  volunteerName: string;
  volunteerEmail: string;
  signatureText: string;
  signedAt: number;
  documentId: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const RED = rgb(0.72, 0.1, 0.13);
const INK = rgb(0.08, 0.08, 0.09);
const MUTED = rgb(0.36, 0.35, 0.34);
const PAPER = rgb(0.98, 0.97, 0.94);

export async function createVolunteerAgreementPdf(input: AgreementPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.title);
  pdf.setAuthor("The Forge Christian Ministries");
  pdf.setSubject(`Signed volunteer agreement for ${input.volunteerName}`);
  pdf.setCreator("The Forge volunteer e-sign workflow");
  pdf.setProducer("The Forge");
  pdf.setCreationDate(new Date(input.signedAt));
  pdf.setModificationDate(new Date(input.signedAt));

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = addPage(pdf);
  let y = PAGE_HEIGHT - MARGIN;
  drawBrandHeader(page, bold, y);
  y -= 64;

  y = drawWrappedText(page, input.title, bold, 22, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 27, INK);
  y -= 10;
  page.drawText("Volunteer agreement", {
    x: MARGIN,
    y,
    font: bold,
    size: 9,
    color: RED,
  });
  page.drawText(`Version ${input.templateVersion}`, {
    x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(`Version ${input.templateVersion}`, 9),
    y,
    font: regular,
    size: 9,
    color: MUTED,
  });
  y -= 32;

  for (const section of parseSections(input.body)) {
    if (y < 120) {
      drawFooter(page, regular, pdf.getPageCount(), input.documentId);
      page = addPage(pdf);
      y = PAGE_HEIGHT - MARGIN;
      drawBrandHeader(page, bold, y);
      y -= 54;
    }
    page.drawText(section.heading.toUpperCase(), {
      x: MARGIN,
      y,
      font: bold,
      size: 10,
      color: RED,
    });
    y -= 17;
    y = drawWrappedText(
      page,
      section.text,
      regular,
      10.5,
      MARGIN,
      y,
      PAGE_WIDTH - MARGIN * 2,
      15.5,
      INK,
    );
    y -= 18;
  }

  if (y < 250) {
    drawFooter(page, regular, pdf.getPageCount(), input.documentId);
    page = addPage(pdf);
    y = PAGE_HEIGHT - MARGIN;
    drawBrandHeader(page, bold, y);
    y -= 58;
  }

  page.drawRectangle({
    x: MARGIN,
    y: y - 185,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 185,
    color: rgb(0.94, 0.93, 0.9),
    borderColor: rgb(0.82, 0.8, 0.75),
    borderWidth: 1,
  });
  page.drawText("ELECTRONIC SIGNATURE", {
    x: MARGIN + 20,
    y: y - 26,
    font: bold,
    size: 10,
    color: RED,
  });
  page.drawText(input.signatureText, {
    x: MARGIN + 20,
    y: y - 72,
    font: italic,
    size: 24,
    color: INK,
  });
  page.drawLine({
    start: { x: MARGIN + 20, y: y - 84 },
    end: { x: PAGE_WIDTH - MARGIN - 20, y: y - 84 },
    thickness: 1,
    color: MUTED,
  });
  const signedDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "long",
    timeStyle: "short",
  }).format(input.signedAt);
  page.drawText(`Printed name: ${input.volunteerName}`, {
    x: MARGIN + 20,
    y: y - 108,
    font: regular,
    size: 10,
    color: INK,
  });
  page.drawText(`Email: ${input.volunteerEmail}`, {
    x: MARGIN + 20,
    y: y - 128,
    font: regular,
    size: 10,
    color: INK,
  });
  page.drawText(`Signed electronically: ${signedDate} Eastern`, {
    x: MARGIN + 20,
    y: y - 148,
    font: regular,
    size: 10,
    color: INK,
  });
  page.drawText(`Document ID: ${input.documentId}`, {
    x: MARGIN + 20,
    y: y - 168,
    font: regular,
    size: 8,
    color: MUTED,
  });

  for (const currentPage of pdf.getPages()) {
    drawFooter(
      currentPage,
      regular,
      pdf.getPages().indexOf(currentPage) + 1,
      input.documentId,
    );
  }

  return pdf.save();
}

function addPage(pdf: PDFDocument) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: PAPER,
  });
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 7,
    width: PAGE_WIDTH,
    height: 7,
    color: RED,
  });
  return page;
}

function drawBrandHeader(page: PDFPage, bold: PDFFont, y: number) {
  page.drawText("THE FORGE", {
    x: MARGIN,
    y,
    font: bold,
    size: 17,
    color: INK,
  });
  page.drawText("BUILDING BOYS INTO FAITHFUL MEN", {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize("BUILDING BOYS INTO FAITHFUL MEN", 8),
    y: y + 3,
    font: bold,
    size: 8,
    color: MUTED,
  });
}

function drawFooter(
  page: PDFPage,
  regular: PDFFont,
  pageNumber: number,
  documentId: string,
) {
  page.drawLine({
    start: { x: MARGIN, y: 39 },
    end: { x: PAGE_WIDTH - MARGIN, y: 39 },
    thickness: 0.5,
    color: rgb(0.78, 0.76, 0.71),
  });
  page.drawText(`The Forge Christian Ministries | ${documentId}`, {
    x: MARGIN,
    y: 24,
    font: regular,
    size: 7.5,
    color: MUTED,
  });
  page.drawText(`Page ${pageNumber}`, {
    x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(`Page ${pageNumber}`, 7.5),
    y: 24,
    font: regular,
    size: 7.5,
    color: MUTED,
  });
}

function parseSections(body: string) {
  return body
    .split(/\n\n+/)
    .map((block) => {
      const [heading, ...rest] = block.split("\n");
      return { heading: heading.trim(), text: rest.join(" ").trim() };
    })
    .filter((section) => section.heading && section.text);
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    page.drawText(line, { x, y, font, size, color });
    y -= lineHeight;
    line = word;
  }
  if (line) {
    page.drawText(line, { x, y, font, size, color });
    y -= lineHeight;
  }
  return y;
}
