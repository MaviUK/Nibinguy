const crypto = require("crypto");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const DEFAULT_TERMS_BODY = `We keep our Terms of Service simple and transparent. By booking or receiving a bin clean from Ni Bin Guy, you agree to:

1) Service & Contracts
- Regular 4-weekly plans are based on a 13-clean minimum term, which is approximately 12 months, unless agreed otherwise.
- One-off cleans have no minimum term.
- Each bin is treated separately; adding another bin may start a new agreement for that bin.
- Bookings and plans are not transferable without our agreement.

2) Bin Availability
- Bins must be left out or made accessible on the scheduled cleaning day and must remain available until 8pm.
- If your bin is not available when we attend, or access is blocked, the clean may still be charged.
- If we are unable to attend on the scheduled day, we will notify you and rearrange the clean as soon as reasonably possible.
- We may be unable to clean if the bin has not been emptied by the council, is too heavy to move safely, or contains unsafe or excessive waste.

3) Cancellations & Minimum Term
- One-off cleans may be cancelled up to 24 hours before the scheduled clean day without charge.
- If a one-off clean is cancelled with less than 24 hours notice, or the bin is not available when we attend, the clean may still be charged in full.
- A 4-weekly plan may be cancelled any time up to 24 hours before the second scheduled clean. If cancelled before the second clean, the first clean will be charged at the standard one-off clean price, and any difference between the 4-weekly price and one-off price will become payable.
- After the second clean, the 4-weekly plan continues for the full 13-clean minimum term.
- If the customer cancels before the end of the 13-clean minimum term, they will remain liable for the outstanding balance for the remaining cleans within the 12-month minimum term.
- After the 13-clean minimum term has been completed, the plan continues on a rolling basis and may be cancelled by giving at least 30 days notice.

4) One-Off Cleans & Animal Waste
- One-off cleans containing dog faeces, cat litter, animal bedding, or other animal faeces/waste will incur a GBP 5 surcharge per affected bin.
- We may refuse to clean bins containing excessive animal waste, hazardous waste, sharp items, medical waste, chemicals, paint, oil, rubble, hot ashes, or anything unsafe.

5) Cleaning Process
- Bins are cleaned inside and outside where safe using pressurised water and detergent.
- Some stains, ingrained smells, paint, tar, or long-term residue may take multiple visits or may not fully remove.
- Any loosened waste may be bagged and left in your bin for disposal.
- Please keep at least 5 metres away during cleaning.

6) Payments
- Payment is due within 7 days of each clean unless agreed otherwise.
- Accepted payment methods are Direct Debit, Bank Transfer, and Card. No cash.
- Cancelling a Direct Debit does not cancel your service or contract. Cancellation must be requested directly with Ni Bin Guy.
- If a 4-weekly plan is cancelled early, any outstanding balance due under the minimum term may still be payable.
- Overdue accounts may result in service being stopped and may be referred for recovery.

7) Customer Responsibilities
- Please keep your contact details, address, and payment details up to date.
- Please tell us in advance if your bin will not be available.
- Please make sure gates are unlocked, access is safe, and pets are secured where needed.
- We have zero tolerance for abuse, threats, or harassment toward staff, including online abuse.

8) Other Terms
- We may place a small sticker or service tag on your bin.
- Discounts are discretionary and may be withdrawn or changed.
- Prices may change outside of any agreed fixed term.

9) Data & Communication
- You consent to us storing your details and contacting you about your booking, schedule, payment, and service.
- Text reminders are a courtesy only. You remain responsible for knowing your scheduled clean date.`;

function pdfSafe(value) {
  return String(value ?? "")
    .replace(/£/g, "GBP ")
    .replace(/•/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function safeFilePart(value) {
  const cleaned = String(value || "customer")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return cleaned || "customer";
}

function wrapText(text, font, fontSize, maxWidth) {
  const lines = [];
  const paragraphs = pdfSafe(text).split(/\r?\n/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.trim().split(/\s+/);
    let line = "";

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
  }

  return lines;
}

function ukDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (_) {
    return iso || "";
  }
}

function buildHash(data) {
  const payload = {
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || "",
    binsText: data.binsText || "",
    pricingText: data.pricingText || "",
    termsAccepted: !!data.termsAccepted,
    termsVersion: data.termsVersion || "",
    termsAcceptanceText: data.termsAcceptanceText || "",
    termsTimestamp: data.termsTimestamp || "",
    termsBody: data.termsBody || DEFAULT_TERMS_BODY,
    source: data.source || "website",
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function buildTermsAcceptancePdfAttachment(data) {
  const termsBody = data.termsBody || DEFAULT_TERMS_BODY;
  const verificationHash = buildHash({ ...data, termsBody });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle("Ni Bin Guy Terms Acceptance Certificate");
  pdfDoc.setAuthor("Ni Bin Guy");
  pdfDoc.setSubject("Customer digital acceptance of terms and conditions");
  pdfDoc.setKeywords(["Ni Bin Guy", "Terms", "Acceptance", "Booking"]);
  pdfDoc.setCreationDate(new Date());

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNumber = 1;

  const addFooter = () => {
    page.drawText(`Page ${pageNumber}`, { x: margin, y: 24, size: 8, font: regular, color: rgb(0.45, 0.45, 0.45) });
    page.drawText("Digital acceptance certificate generated from the website booking form.", {
      x: margin + 70,
      y: 24,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
    });
  };

  const newPage = () => {
    addFooter();
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pageNumber += 1;
    y = pageHeight - margin;
  };

  const ensureSpace = (height) => {
    if (y - height < margin + 20) newPage();
  };

  const drawLine = (text, options = {}) => {
    const size = options.size || 10;
    const font = options.bold ? bold : regular;
    const gap = options.gap || size + 4;
    const indent = options.indent || 0;
    ensureSpace(gap + 2);
    page.drawText(pdfSafe(text), {
      x: margin + indent,
      y,
      size,
      font,
      color: options.color || rgb(0.1, 0.1, 0.1),
    });
    y -= gap;
  };

  const drawWrapped = (text, options = {}) => {
    const size = options.size || 10;
    const font = options.bold ? bold : regular;
    const lineGap = options.lineGap || size + 4;
    const indent = options.indent || 0;
    const lines = wrapText(text, font, size, maxWidth - indent);

    for (const line of lines) {
      if (!line) {
        y -= lineGap / 2;
        continue;
      }
      ensureSpace(lineGap + 2);
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: options.color || rgb(0.1, 0.1, 0.1),
      });
      y -= lineGap;
    }
  };

  const drawSectionTitle = (title) => {
    y -= 8;
    ensureSpace(26);
    page.drawText(pdfSafe(title), { x: margin, y, size: 13, font: bold, color: rgb(0.02, 0.35, 0.16) });
    y -= 18;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: pageWidth - margin, y: y + 5 }, thickness: 0.8, color: rgb(0.8, 0.86, 0.8) });
  };

  page.drawText("Ni Bin Guy", { x: margin, y, size: 24, font: bold, color: rgb(0.02, 0.35, 0.16) });
  y -= 30;
  page.drawText("Terms & Conditions Acceptance Certificate", { x: margin, y, size: 17, font: bold, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  drawWrapped("This PDF records the customer's digital acceptance of the Ni Bin Guy Terms of Service when submitting a booking request.", { size: 10 });

  drawSectionTitle("Acceptance details");
  drawLine(`Accepted: ${data.termsAccepted ? "Yes" : "No"}`);
  drawLine(`Terms version: ${data.termsVersion || ""}`);
  drawLine(`Accepted at: ${ukDateTime(data.termsTimestamp)} Europe/London`);
  drawWrapped(`Acceptance wording: ${data.termsAcceptanceText || ""}`);
  drawWrapped(`Verification SHA-256: ${verificationHash}`, { size: 8 });

  drawSectionTitle("Customer details");
  drawLine(`Name: ${data.name || ""}`);
  drawLine(`Email: ${data.email || ""}`);
  drawLine(`Phone: ${data.phone || ""}`);
  drawWrapped(`Address: ${data.address || ""}`);
  drawLine(`Booking source: ${data.source || "website"}`);

  drawSectionTitle("Booking summary");
  drawWrapped(data.binsText || "(none provided)");
  y -= 4;
  drawWrapped(data.pricingText || "Pricing not provided.");

  drawSectionTitle("Terms agreed to");
  drawWrapped(termsBody, { size: 9, lineGap: 12 });

  addFooter();

  const pdfBytes = await pdfDoc.save();
  const filename = `Ni-Bin-Guy-Terms-Acceptance-${safeFilePart(data.name || data.email)}.pdf`;

  return {
    filename,
    content: Buffer.from(pdfBytes).toString("base64"),
    contentType: "application/pdf",
  };
}

module.exports = {
  buildTermsAcceptancePdfAttachment,
  DEFAULT_TERMS_BODY,
};
