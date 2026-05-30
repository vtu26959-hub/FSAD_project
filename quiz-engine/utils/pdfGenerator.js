// =============================================
// utils/pdfGenerator.js - PDF Certificate Generator
// =============================================

const PDFDocument = require('pdfkit');

/**
 * Generates a styled PDF certificate and pipes it to the response.
 * @param {object} res - Express response object
 * @param {object} data - { userName, score, total, percentage, certificateId, date }
 */
function generateCertificate(res, data) {
    const { userName, score, total, percentage, certificateId, date } = data;

    // Create a new PDF document (landscape)
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 60, right: 60 }
    });

    // Set HTTP headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate_${certificateId}.pdf"`
    );

    // Pipe the PDF into the response
    doc.pipe(res);

    // ---- BACKGROUND ----
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f0c29');

    // ---- GRADIENT BORDER EFFECT ----
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(3)
        .stroke('#a855f7');

    doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56)
        .lineWidth(1)
        .stroke('#6366f1');

    // ---- DECORATIVE CORNER ELEMENTS ----
    const corners = [
        [22, 22], [doc.page.width - 72, 22],
        [22, doc.page.height - 72], [doc.page.width - 72, doc.page.height - 72]
    ];
    corners.forEach(([x, y]) => {
        doc.rect(x, y, 50, 50).lineWidth(2).stroke('#a855f7');
    });

    // ---- HEADER LOGO AREA ----
    doc.fontSize(11)
        .fillColor('#a855f7')
        .font('Helvetica-Bold')
        .text('⬡  QUIZ ENGINE', 60, 55, { align: 'center' });

    // ---- CERTIFICATE TITLE ----
    doc.moveDown(0.5);
    doc.fontSize(36)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('CERTIFICATE', { align: 'center' });

    doc.fontSize(18)
        .fillColor('#a5b4fc')
        .font('Helvetica')
        .text('OF ACHIEVEMENT', { align: 'center' });

    // ---- DIVIDER ----
    const centerY = doc.y + 15;
    doc.moveTo(100, centerY)
        .lineTo(doc.page.width - 100, centerY)
        .lineWidth(1)
        .stroke('#6366f1');
    doc.moveDown(1.5);

    // ---- BODY TEXT ----
    doc.fontSize(13)
        .fillColor('#c7d2fe')
        .font('Helvetica')
        .text('This is to certify that', { align: 'center' });

    doc.moveDown(0.4);

    // ---- RECIPIENT NAME ----
    doc.fontSize(32)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(userName, { align: 'center', underline: false });

    // ---- NAME UNDERLINE ----
    const nameY = doc.y;
    const nameWidth = 300;
    const nameX = (doc.page.width - nameWidth) / 2;
    doc.moveTo(nameX, nameY)
        .lineTo(nameX + nameWidth, nameY)
        .lineWidth(1)
        .stroke('#a855f7');

    doc.moveDown(0.8);

    // ---- ACHIEVEMENT TEXT ----
    doc.fontSize(13)
        .fillColor('#c7d2fe')
        .font('Helvetica')
        .text('has successfully completed the quiz and demonstrated excellence in', { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(16)
        .fillColor('#a855f7')
        .font('Helvetica-Bold')
        .text('Web Development Fundamentals Assessment', { align: 'center' });

    doc.moveDown(0.8);

    // ---- SCORE BADGE ----
    const scoreText = `Score: ${score} / ${total}  |  ${percentage}%`;
    doc.fontSize(14)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(scoreText, { align: 'center' });

    doc.moveDown(1.5);

    // ---- BOTTOM DIVIDER ----
    const bottomDivY = doc.y;
    doc.moveTo(100, bottomDivY)
        .lineTo(doc.page.width - 100, bottomDivY)
        .lineWidth(1)
        .stroke('#6366f1');

    doc.moveDown(0.8);

    // ---- FOOTER INFO ----
    const footerY = doc.y;
    const dateStr = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    doc.fontSize(10)
        .fillColor('#818cf8')
        .font('Helvetica')
        .text(`Date of Completion: ${dateStr}`, 80, footerY, { align: 'left', width: 250 });

    doc.fontSize(10)
        .fillColor('#818cf8')
        .font('Helvetica')
        .text(`Certificate ID: ${certificateId}`, 0, footerY, { align: 'right', width: doc.page.width - 80 });

    // Finalize the PDF
    doc.end();
}

module.exports = { generateCertificate };
