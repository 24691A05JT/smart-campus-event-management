const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  downloadCertificatePDF,
} = require('../controllers/certificateController');

// All routes are protected by JWT authentication middleware
router.use(protect);

router.post('/generate', generateCertificate);
router.post('/:eventId/generate', generateCertificate);
router.get('/my', getMyCertificates);
router.get('/:certificateId/download', downloadCertificatePDF);
router.get('/:certificateId', getCertificateById);

module.exports = router;
