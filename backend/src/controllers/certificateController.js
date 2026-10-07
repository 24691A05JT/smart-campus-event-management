const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { generateCertificatePDF } = require('../services/certificateService');
const { createNotification } = require('../services/notificationService');

/**
 * Helper to generate a unique Certificate ID
 */
const generateUniqueCertificateId = async () => {
  const year = new Date().getFullYear();
  let certId = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    certId = `CERT-${year}-${randomHex}`;
    const found = await Certificate.findOne({ certificateId: certId });
    if (!found) {
      exists = false;
    }
    attempts++;
  }
  return certId;
};

/**
 * @desc    Generate digital PDF certificate for an event
 * @route   POST /api/certificates/:eventId/generate or POST /api/certificates/generate
 * @access  Private (Student, or Organizer/Admin on behalf)
 */
const generateCertificate = async (req, res, next) => {
  try {
    const body = req.body || {};
    const eventId = req.params.eventId || body.eventId;
    const studentId = body.studentId && ['organizer', 'admin'].includes(req.user.role)
      ? body.studentId
      : req.user._id;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event ID',
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId).populate('organizer', 'name email department');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // 1. Verify student registration & attendance
    const registration = await Registration.findOne({
      student: studentId,
      event: eventId,
      status: 'registered',
    });

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'Ineligible for certificate. You must be registered for the event.',
      });
    }

    if (registration.attendanceStatus !== 'present') {
      return res.status(400).json({
        success: false,
        message: 'Ineligible for certificate. Attendance must be marked as PRESENT.',
      });
    }

    // 2. Prevent duplicate certificate generation
    let existingCertificate = await Certificate.findOne({
      student: studentId,
      event: eventId,
    }).populate('event', 'title category date venue organizer');

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        message: 'Certificate already generated',
        data: existingCertificate,
      });
    }

    // 3. Generate Certificate metadata
    const certCode = await generateUniqueCertificateId();
    const downloadUrl = `/api/certificates/${certCode}/download`;

    const certificate = await Certificate.create({
      certificateId: certCode,
      student: studentId,
      event: eventId,
      issueDate: new Date(),
      pdfPath: downloadUrl,
      certificateUrl: downloadUrl,
    });

    // Update registration flags
    registration.certificateGenerated = true;
    registration.certificateUrl = downloadUrl;
    await registration.save();

    // Populate for response
    await certificate.populate([
      { path: 'student', select: 'name email department' },
      { path: 'event', select: 'title category date venue organizer', populate: { path: 'organizer', select: 'name email department' } },
    ]);

    // 4. Create notification for the student
    await createNotification({
      userId: studentId,
      title: 'Certificate Ready 🎓',
      message: `Your certificate for "${event.title}" has been issued. Certificate ID: ${certCode}`,
      type: 'certificate',
      link: '/certificates',
      recipientEmail: req.user.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate,
    });
  } catch (error) {
    if (error.code === 11000) {
      const cert = await Certificate.findOne({ student: req.user._id, event: req.params.eventId }).populate('event');
      return res.status(200).json({
        success: true,
        message: 'Certificate already exists',
        data: cert,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get certificates for logged-in student
 * @route   GET /api/certificates/my
 * @access  Private (Student)
 */
const getMyCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user._id })
      .populate({
        path: 'event',
        select: 'title description category date startTime endTime venue bannerUrl organizer',
        populate: { path: 'organizer', select: 'name email department' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get certificate by Certificate ID or MongoDB ID
 * @route   GET /api/certificates/:certificateId
 * @access  Private (Student owner, Event organizer, Admin)
 */
const getCertificateById = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    let certificate;
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      certificate = await Certificate.findById(certificateId)
        .populate('student', 'name email department')
        .populate({
          path: 'event',
          select: 'title category date venue organizer',
          populate: { path: 'organizer', select: 'name email department' },
        });
    }

    if (!certificate) {
      certificate = await Certificate.findOne({ certificateId })
        .populate('student', 'name email department')
        .populate({
          path: 'event',
          select: 'title category date venue organizer',
          populate: { path: 'organizer', select: 'name email department' },
        });
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    // RBAC: Verify access authorization
    const studentOwnerId = certificate.student._id ? certificate.student._id.toString() : certificate.student.toString();
    const organizerId = certificate.event && certificate.event.organizer
      ? (certificate.event.organizer._id ? certificate.event.organizer._id.toString() : certificate.event.organizer.toString())
      : null;

    const isStudentOwner = req.user._id.toString() === studentOwnerId;
    const isOrganizerOwner = organizerId && req.user._id.toString() === organizerId;
    const isAdmin = req.user.role === 'admin';

    if (!isStudentOwner && !isOrganizerOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to view this certificate.',
      });
    }

    return res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stream / Download PDF certificate file
 * @route   GET /api/certificates/:certificateId/download or GET /api/certificates/event/:eventId/download
 * @access  Private (Student owner, Event organizer, Admin)
 */
const downloadCertificatePDF = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    let certificate;
    if (mongoose.Types.ObjectId.isValid(certificateId)) {
      certificate = await Certificate.findById(certificateId)
        .populate('student', 'name email department')
        .populate({
          path: 'event',
          select: 'title category date venue organizer',
          populate: { path: 'organizer', select: 'name email department' },
        });
    }

    if (!certificate) {
      certificate = await Certificate.findOne({ certificateId })
        .populate('student', 'name email department')
        .populate({
          path: 'event',
          select: 'title category date venue organizer',
          populate: { path: 'organizer', select: 'name email department' },
        });
    }

    // Also support download by eventId if student is logged in
    if (!certificate && mongoose.Types.ObjectId.isValid(certificateId)) {
      certificate = await Certificate.findOne({ event: certificateId, student: req.user._id })
        .populate('student', 'name email department')
        .populate({
          path: 'event',
          select: 'title category date venue organizer',
          populate: { path: 'organizer', select: 'name email department' },
        });
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate record not found',
      });
    }

    // RBAC Security Check
    const studentOwnerId = certificate.student._id ? certificate.student._id.toString() : certificate.student.toString();
    const organizerId = certificate.event && certificate.event.organizer
      ? (certificate.event.organizer._id ? certificate.event.organizer._id.toString() : certificate.event.organizer.toString())
      : null;

    const isStudentOwner = req.user._id.toString() === studentOwnerId;
    const isOrganizerOwner = organizerId && req.user._id.toString() === organizerId;
    const isAdmin = req.user.role === 'admin';

    if (!isStudentOwner && !isOrganizerOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to download this certificate.',
      });
    }

    // Generate PDF Buffer dynamically using PDFKit service
    const pdfBuffer = await generateCertificatePDF({
      certificateId: certificate.certificateId,
      studentName: certificate.student ? certificate.student.name : 'Student',
      studentDepartment: certificate.student ? certificate.student.department : '',
      eventTitle: certificate.event ? certificate.event.title : 'Campus Event',
      eventCategory: certificate.event ? certificate.event.category : 'General',
      eventDate: certificate.event ? certificate.event.date : new Date(),
      eventVenue: certificate.event ? certificate.event.venue : 'Main Campus',
      organizerName: certificate.event && certificate.event.organizer ? certificate.event.organizer.name : 'Event Organizer',
      issueDate: certificate.issueDate,
    });

    const fileName = `Certificate_${certificate.certificateId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  downloadCertificatePDF,
};
