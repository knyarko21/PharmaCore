
const PDFDocument = require("pdfkit");

// ======================================================
// Helpers
// ======================================================

const formatCurrency = (value) =>
  `GH₵${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// ======================================================
// Generate Receipt PDF
// ======================================================
//
// Streams a PDF receipt directly to a writable stream
// (typically the HTTP response object).
//
// Usage:
//   await generateReceiptPdf({ sale, stream: res });
// ======================================================

const generateReceiptPdf = ({ sale, stream }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Receipt ${sale.saleNumber}`,
          Author: "PharmaCore",
          Subject: "Sale Receipt"
        }
      });

      doc.pipe(stream);

      stream.on("finish", resolve);
      stream.on("error", reject);

      // ----------------------------------------------
      // Header
      // ----------------------------------------------

      doc
        .fillColor("#8b5cf6")
        .fontSize(28)
        .font("Helvetica-Bold")
        .text("PharmaCore", { align: "left" });

      doc
        .fillColor("#52525b")
        .fontSize(10)
        .font("Helvetica")
        .text("Pharmacy Management System", { align: "left" });

      doc.moveDown(0.5);

      doc
        .fillColor("#111113")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("RECEIPT", { align: "right" });

      doc.moveUp(2);

      doc
        .fillColor("#52525b")
        .fontSize(10)
        .font("Helvetica")
        .text(`Sale #${sale.saleNumber}`, { align: "right" });

      doc.text(formatDateTime(sale.saleDate), { align: "right" });

      doc.moveDown(1.5);

      // ----------------------------------------------
      // Divider
      // ----------------------------------------------

      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#e4e4e7")
        .stroke();

      doc.moveDown(1);

      // ----------------------------------------------
      // Customer + Cashier
      // ----------------------------------------------

      const infoY = doc.y;
      const colWidth = (doc.page.width - 100) / 2;

      doc
        .fillColor("#52525b")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("CUSTOMER", 50, infoY);

      doc
        .fillColor("#18181b")
        .fontSize(11)
        .font("Helvetica")
        .text(
          sale.customer
            ? `${sale.customer.firstName} ${sale.customer.lastName}`
            : "Walk-in Customer",
          50,
          infoY + 14
        );

      if (sale.customer?.phone) {
        doc
          .fillColor("#52525b")
          .fontSize(10)
          .text(sale.customer.phone, 50, infoY + 32);
      }

      doc
        .fillColor("#52525b")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("SERVED BY", 50 + colWidth, infoY);

      doc
        .fillColor("#18181b")
        .fontSize(11)
        .font("Helvetica")
        .text(
          sale.creator
            ? `${sale.creator.firstName} ${sale.creator.lastName}`
            : "—",
          50 + colWidth,
          infoY + 14
        );

      if (sale.creator?.role) {
        doc
          .fillColor("#52525b")
          .fontSize(10)
          .text(sale.creator.role, 50 + colWidth, infoY + 32);
      }

      doc.moveDown(3);

      // ----------------------------------------------
      // Items table
      // ----------------------------------------------

      const tableTop = doc.y;
      const colX = {
        item: 50,
        qty: 330,
        price: 400,
        total: 480
      };

      doc
        .fillColor("#52525b")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("ITEM", colX.item, tableTop)
        .text("QTY", colX.qty, tableTop)
        .text("PRICE", colX.price, tableTop)
        .text("TOTAL", colX.total, tableTop, {
          width: 70,
          align: "right"
        });

      doc.moveDown(0.5);

      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#e4e4e7")
        .stroke();

      doc.moveDown(0.5);

      let y = doc.y;

      const items = sale.items || [];

      items.forEach((item) => {
        const name =
          item.medicine?.name || `Medicine #${item.medicineId}`;

        doc
          .fillColor("#18181b")
          .fontSize(10)
          .font("Helvetica")
          .text(name, colX.item, y, { width: 270 });

        doc.text(String(item.quantity), colX.qty, y);
        doc.text(formatCurrency(item.unitPrice), colX.price, y);
        doc.text(formatCurrency(item.totalPrice), colX.total, y, {
          width: 70,
          align: "right"
        });

        y += 22;
      });

      doc.y = y;

      doc.moveDown(1);

      // ----------------------------------------------
      // Totals
      // ----------------------------------------------

      doc
        .moveTo(300, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#e4e4e7")
        .stroke();

      doc.moveDown(0.5);

      const totalsX = 350;
      const valueX = 450;

      const writeTotal = (label, value, bold = false) => {
        const currentY = doc.y;

        doc
          .fillColor("#52525b")
          .fontSize(10)
          .font("Helvetica")
          .text(label, totalsX, currentY);

        doc
          .fillColor("#18181b")
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .text(value, valueX, currentY, {
            width: doc.page.width - valueX - 50,
            align: "right"
          });

        doc.moveDown(0.6);
      };

      writeTotal("Subtotal", formatCurrency(sale.subtotal));
      writeTotal("Discount", `- ${formatCurrency(sale.discount)}`);
      writeTotal("Tax", `+ ${formatCurrency(sale.tax)}`);

      doc.moveDown(0.3);

      doc
        .moveTo(totalsX, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .strokeColor("#e4e4e7")
        .stroke();

      doc.moveDown(0.5);

      writeTotal("TOTAL", formatCurrency(sale.totalAmount), true);

      doc.moveDown(0.5);

      // ----------------------------------------------
      // Payment info
      // ----------------------------------------------

      const payment = sale.payments?.[0];

      if (payment) {
        doc
          .fillColor("#52525b")
          .fontSize(9)
          .font("Helvetica-Bold")
          .text("PAYMENT METHOD", 50, doc.y);

        doc
          .fillColor("#18181b")
          .fontSize(11)
          .font("Helvetica")
          .text(
            payment.paymentMethod?.replace(/_/g, " ") || "—"
          );

        if (payment.transactionReference) {
          doc
            .fillColor("#52525b")
            .fontSize(9)
            .text(`Ref: ${payment.transactionReference}`);
        }
      }

      // ----------------------------------------------
      // Footer
      // ----------------------------------------------

      const footerY = doc.page.height - 90;

      doc
        .moveTo(50, footerY)
        .lineTo(doc.page.width - 50, footerY)
        .strokeColor("#e4e4e7")
        .stroke();

      doc
        .fillColor("#52525b")
        .fontSize(9)
        .font("Helvetica")
        .text("Thank you for choosing PharmaCore.", 50, footerY + 12, {
          align: "center",
          width: doc.page.width - 100
        });

      doc.text(
        "This receipt was generated automatically.",
        50,
        footerY + 28,
        {
          align: "center",
          width: doc.page.width - 100
        }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReceiptPdf
};