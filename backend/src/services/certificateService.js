const PDFDocument = require('pdfkit');

/**
 * Generates a PDF Certificate buffer using PDFKit.
 *
 * @param {Object} data
 * @param {string} data.certificateId - Unique certificate ID (e.g. CERT-2026-X1Y2Z3)
 * @param {string} data.studentName - Full name of the student
 * @param {string} data.studentDepartment - Department of the student
 * @param {string} data.eventTitle - Name of the event
 * @param {string} data.eventCategory - Category of the event
 * @param {string|Date} data.eventDate - Date when the event took place
 * @param {string} data.eventVenue - Venue of the event
 * @param {string} data.organizerName - Organizer / Faculty Name
 * @param {string|Date} data.issueDate - Date when certificate was issued
 * @returns {Promise<Buffer>} Resolves to PDF document Buffer
 */
const generateCertificatePDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      // Create landscape A4 document: 841.89 x 595.28 pt
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer Decorative Border (Dark Slate Blue)
      doc
        .rect(20, 20, width - 40, height - 40)
        .lineWidth(3)
        .strokeColor('#1e293b') // slate-800
        .stroke();

      // Inner Decorative Gold Accent Border
      doc
        .rect(28, 28, width - 56, height - 56)
        .lineWidth(1.5)
        .strokeColor('#d97706') // amber-600 gold accent
        .stroke();

      // Corner Decorative Graphics
      const drawCornerPattern = (x, y, scaleX = 1, scaleY = 1) => {
        doc.save();
        doc.translate(x, y);
        doc.scale(scaleX, scaleY);
        doc.rect(0, 0, 30, 4).fill('#2563eb'); // blue-600
        doc.rect(0, 0, 4, 30).fill('#2563eb');
        doc.restore();
      };

      drawCornerPattern(32, 32, 1, 1);
      drawCornerPattern(width - 32, 32, -1, 1);
      drawCornerPattern(32, height - 32, 1, -1);
      drawCornerPattern(width - 32, height - 32, -1, -1);

      // Header: Institution / Organization Name
      doc
        .fillColor('#1e293b')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('SMART CAMPUS UNIVERSITY', 0, 65, { align: 'center' });

      doc
        .fillColor('#64748b')
        .fontSize(11)
        .font('Helvetica')
        .text('OFFICE OF ACADEMIC & EXTRA-CURRICULAR ACTIVITIES', 0, 93, { align: 'center' });

      // Certificate Title Banner
      doc
        .fillColor('#2563eb')
        .fontSize(26)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF PARTICIPATION', 0, 125, { align: 'center', characterSpacing: 1.5 });

      // Subtitle Line
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(width / 2 - 180, 158)
        .lineTo(width / 2 + 180, 158)
        .stroke();

      // Body Text: "This is to certify that"
      doc
        .fillColor('#475569')
        .fontSize(13)
        .font('Helvetica')
        .text('This is proudly presented to', 0, 175, { align: 'center' });

      // Student Name (Prominent & Elegant)
      const studentNameText = data.studentName || 'Student Name';
      doc
        .fillColor('#0f172a')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(studentNameText.toUpperCase(), 0, 202, { align: 'center' });

      // Student Department (if available)
      if (data.studentDepartment) {
        doc
          .fillColor('#64748b')
          .fontSize(11)
          .font('Helvetica-Oblique')
          .text(`Department of ${data.studentDepartment}`, 0, 232, { align: 'center' });
      }

      // Achievement Statement
      const formattedEventDate = data.eventDate
        ? new Date(data.eventDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'recent date';

      const eventTitleText = data.eventTitle || 'Campus Event';

      doc
        .fillColor('#334155')
        .fontSize(13)
        .font('Helvetica')
        .text(
          `for actively participating in and successfully completing the ${
            data.eventCategory ? data.eventCategory + ' event' : 'event'
          }`,
          0,
          260,
          { align: 'center' }
        );

      doc
        .fillColor('#1e40af')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`"${eventTitleText}"`, 0, 282, { align: 'center' });

      doc
        .fillColor('#475569')
        .fontSize(11)
        .font('Helvetica')
        .text(
          `held on ${formattedEventDate}${data.eventVenue ? ` at ${data.eventVenue}` : ''}.`,
          0,
          310,
          { align: 'center' }
        );

      // Unique Certificate ID Badge Box
      const certId = data.certificateId || 'CERT-2026-000000';
      const formattedIssueDate = data.issueDate
        ? new Date(data.issueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      doc
        .rect(width / 2 - 170, 345, 340, 30)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`CERTIFICATE ID: `, width / 2 - 160, 355, { continued: true })
        .fillColor('#2563eb')
        .font('Helvetica')
        .text(`${certId}   |   `, { continued: true })
        .fillColor('#475569')
        .font('Helvetica-Bold')
        .text(`ISSUED: `, { continued: true })
        .fillColor('#334155')
        .font('Helvetica')
        .text(`${formattedIssueDate}`);

      // Signatures Section (Left & Right)
      const sigY = 435;

      // Left Signature: Event Organizer / Faculty Coordinator
      doc
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .moveTo(120, sigY)
        .lineTo(300, sigY)
        .stroke();

      doc
        .fillColor('#0f172a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(data.organizerName || 'Event Coordinator', 120, sigY + 8, { width: 180, align: 'center' });

      doc
        .fillColor('#64748b')
        .fontSize(10)
        .font('Helvetica')
        .text('Faculty Coordinator / Organizer', 120, sigY + 24, { width: 180, align: 'center' });

      // Right Signature: Smart Campus Authority
      doc
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .moveTo(width - 300, sigY)
        .lineTo(width - 120, sigY)
        .stroke();

      doc
        .fillColor('#0f172a')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Dr. Sarah Jenkins', width - 300, sigY + 8, { width: 180, align: 'center' });

      doc
        .fillColor('#64748b')
        .fontSize(10)
        .font('Helvetica')
        .text('Dean of Student Affairs', width - 300, sigY + 24, { width: 180, align: 'center' });

      // Footer Verification Note
      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica')
        .text(
          'This digital certificate is officially issued and verified by Smart Campus Event Management System.',
          0,
          height - 50,
          { align: 'center' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateCertificatePDF,
};
