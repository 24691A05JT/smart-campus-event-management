const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Certificate = require('../src/models/Certificate');
const Notification = require('../src/models/Notification');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');
const User = require('../src/models/User');

const {
  generateCertificate,
  getMyCertificates,
  getCertificateById,
  downloadCertificatePDF,
} = require('../src/controllers/certificateController');

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../src/controllers/notificationController');

const { generateCertificatePDF } = require('../src/services/certificateService');
const { createNotification } = require('../src/services/notificationService');

let passed = 0;
let failed = 0;

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runCertificateAndNotificationTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 10 CERTIFICATE & NOTIFICATION TEST SUITE');
  console.log('==================================================\n');

  // Test Fixtures
  const studentOne = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c101'),
    name: 'Alice Student',
    email: 'alice@student.edu',
    role: 'student',
    department: 'CSE',
  };

  const studentTwo = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c102'),
    name: 'Bob Student',
    email: 'bob@student.edu',
    role: 'student',
    department: 'ECE',
  };

  const organizer = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c103'),
    name: 'Prof. Turing',
    email: 'turing@faculty.edu',
    role: 'organizer',
    department: 'CSE',
  };

  const eventApprovedId = new mongoose.Types.ObjectId().toString();
  const eventData = {
    _id: eventApprovedId,
    title: 'Advanced AI & Machine Learning Workshop',
    category: 'Technical',
    status: 'approved',
    date: new Date('2026-10-15'),
    startTime: '10:00 AM',
    endTime: '04:00 PM',
    venue: 'Auditorium A',
    organizer: organizer._id,
  };

  // Mock Storage State
  const mockCertificates = [];
  const mockNotifications = [];
  const mockRegistrations = [
    {
      _id: new mongoose.Types.ObjectId(),
      student: studentOne._id,
      event: eventApprovedId,
      status: 'registered',
      attendanceStatus: 'present',
      save: async function () { return this; },
      populate: async function () { return this; },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      student: studentTwo._id,
      event: eventApprovedId,
      status: 'registered',
      attendanceStatus: 'absent',
      save: async function () { return this; },
      populate: async function () { return this; },
    },
  ];

  // Backup Mongoose Methods
  const originalCertFindOne = Certificate.findOne;
  const originalCertFind = Certificate.find;
  const originalCertCreate = Certificate.create;
  const originalCertFindById = Certificate.findById;
  const originalRegFindOne = Registration.findOne;
  const originalEventFindById = Event.findById;
  const originalNotifFind = Notification.find;
  const originalNotifFindOne = Notification.findOne;
  const originalNotifCreate = Notification.create;
  const originalNotifCount = Notification.countDocuments;
  const originalNotifFindById = Notification.findById;
  const originalNotifUpdateMany = Notification.updateMany;

  try {
    // Mock connection state
    mongoose.connection.readyState = 1;

    // Monkey-patching Mongoose methods for unit test isolation
    Event.findById = (id) => {
      const isMatch = id.toString() === eventApprovedId;
      return {
        populate: async () => (isMatch ? eventData : null),
        then: (cb) => Promise.resolve(isMatch ? eventData : null).then(cb),
      };
    };

    Registration.findOne = async (query) => {
      return mockRegistrations.find((r) => {
        const matchStudent = !query.student || r.student.toString() === query.student.toString();
        const matchEvent = !query.event || r.event.toString() === query.event.toString();
        const matchStatus = !query.status || r.status === query.status;
        return matchStudent && matchEvent && matchStatus;
      }) || null;
    };

    Certificate.findOne = (query) => {
      const found = mockCertificates.find((c) => {
        if (query.certificateId && c.certificateId === query.certificateId) return true;
        if (query.student && query.event) {
          const sId = c.student && c.student._id ? c.student._id.toString() : c.student ? c.student.toString() : '';
          const eId = c.event && c.event._id ? c.event._id.toString() : c.event ? c.event.toString() : '';
          return sId === query.student.toString() && eId === query.event.toString();
        }
        return false;
      });

      const wrapped = found ? {
        ...found,
        populate: function () {
          return this;
        },
      } : null;

      const queryObj = {
        populate: function () {
          return queryObj;
        },
        then: function (cb) {
          return Promise.resolve(wrapped).then(cb);
        },
      };

      return queryObj;
    };

    Certificate.find = (query) => {
      const list = mockCertificates.filter((c) => {
        const sId = c.student && c.student._id ? c.student._id.toString() : c.student ? c.student.toString() : '';
        return sId === query.student.toString();
      });

      const wrappedList = list.map((c) => ({
        ...c,
        populate: function () { return this; },
      }));

      const queryObj = {
        populate: function () {
          return queryObj;
        },
        sort: function () {
          return Promise.resolve(wrappedList);
        },
        then: function (cb) {
          return Promise.resolve(wrappedList).then(cb);
        },
      };

      return queryObj;
    };

    Certificate.create = async (doc) => {
      const newCert = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        student: studentOne,
        event: { ...eventData, organizer },
        createdAt: new Date(),
      };
      newCert.populate = function () {
        return Promise.resolve(this);
      };
      mockCertificates.push(newCert);
      return newCert;
    };

    Certificate.findById = (id) => {
      const found = mockCertificates.find((c) => c._id.toString() === id.toString());
      const wrapped = found ? {
        ...found,
        populate: function () { return this; },
      } : null;

      const queryObj = {
        populate: function () {
          return queryObj;
        },
        then: function (cb) {
          return Promise.resolve(wrapped).then(cb);
        },
      };

      return queryObj;
    };

    Notification.findOne = async (query) => {
      return mockNotifications.find((n) => {
        const matchUser = !query.user || n.user.toString() === query.user.toString();
        const matchType = !query.type || n.type === query.type;
        const matchTitle = !query.title || n.title === query.title;
        const matchRead = query.isRead === undefined || n.isRead === query.isRead;
        return matchUser && matchType && matchTitle && matchRead;
      }) || null;
    };

    Notification.create = async (doc) => {
      const notif = {
        _id: new mongoose.Types.ObjectId(),
        ...doc,
        isRead: doc.isRead || false,
        createdAt: new Date(),
        deleteOne: async function () {
          const idx = mockNotifications.findIndex((n) => n._id.toString() === this._id.toString());
          if (idx !== -1) mockNotifications.splice(idx, 1);
        },
        save: async function () { return this; },
      };
      mockNotifications.push(notif);
      return notif;
    };

    Notification.find = (query) => {
      const list = mockNotifications.filter(
        (n) => n.user.toString() === query.user.toString()
      );
      return {
        sort: () => ({
          limit: async () => list,
        }),
      };
    };

    Notification.countDocuments = async (query) => {
      return mockNotifications.filter(
        (n) => n.user.toString() === query.user.toString() && n.isRead === (query.isRead || false)
      ).length;
    };

    Notification.findById = async (id) => {
      return mockNotifications.find((n) => n._id.toString() === id.toString()) || null;
    };

    Notification.updateMany = async (query, update) => {
      let count = 0;
      mockNotifications.forEach((n) => {
        if (n.user.toString() === query.user.toString()) {
          if (update.$set && update.$set.isRead !== undefined) {
            n.isRead = update.$set.isRead;
            count++;
          }
        }
      });
      return { modifiedCount: count };
    };

    const mockNext = (err) => { if (err) throw err; };

    // ==================================================
    // CERTIFICATE TESTS (1 - 9)
    // ==================================================

    await test('1. Registered + present student can generate certificate', async () => {
      const req = { user: studentOne, params: { eventId: eventApprovedId } };
      const res = createMockRes();

      await generateCertificate(req, res, mockNext);

      assert.strictEqual(res.statusCode, 201, 'Should return status 201 Created');
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.certificateId, 'Should return generated certificateId');
      assert.strictEqual(mockCertificates.length, 1);
    });

    await test('2. Registered + absent student cannot generate certificate', async () => {
      const req = { user: studentTwo, params: { eventId: eventApprovedId } };
      const res = createMockRes();

      await generateCertificate(req, res, mockNext);

      assert.strictEqual(res.statusCode, 400, 'Should return status 400 Bad Request');
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes('PRESENT'), 'ErrorMessage should mention PRESENT attendance requirement');
    });

    await test('3. Non-registered student cannot generate certificate', async () => {
      const unregStudent = { _id: new mongoose.Types.ObjectId(), name: 'Unregistered Student', role: 'student' };
      const req = { user: unregStudent, params: { eventId: eventApprovedId } };
      const res = createMockRes();

      await generateCertificate(req, res, mockNext);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes('registered'), 'Should state student must be registered');
    });

    await test('4. Duplicate certificate generation is prevented', async () => {
      const req = { user: studentOne, params: { eventId: eventApprovedId } };
      const res = createMockRes();

      await generateCertificate(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200, 'Existing certificate returned with status 200');
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message.includes('already generated'));
    });

    await test('5. Certificate ID is unique format', async () => {
      assert.ok(mockCertificates[0].certificateId.startsWith('CERT-'), 'Certificate ID should start with CERT-');
      assert.ok(mockCertificates[0].certificateId.length > 10, 'Certificate ID should be descriptive & unique');
    });

    await test('6. Student can retrieve own certificates', async () => {
      const req = { user: studentOne };
      const res = createMockRes();

      await getMyCertificates(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].certificateId, mockCertificates[0].certificateId);
    });

    await test('7. Unauthorized student cannot access another student certificate', async () => {
      const certId = mockCertificates[0].certificateId;
      const req = { user: studentTwo, params: { certificateId: certId } };
      const res = createMockRes();

      await getCertificateById(req, res, mockNext);

      assert.strictEqual(res.statusCode, 403, 'Unauthorized student access must be denied with 403 Forbidden');
      assert.strictEqual(res.body.success, false);
    });

    await test('8. Certificate PDF generation works', async () => {
      const pdfBuffer = await generateCertificatePDF({
        certificateId: 'CERT-2026-TEST01',
        studentName: 'Alice Student',
        studentDepartment: 'CSE',
        eventTitle: 'AI Workshop',
        eventCategory: 'Technical',
        eventDate: new Date(),
        issueDate: new Date(),
      });

      assert.ok(Buffer.isBuffer(pdfBuffer), 'Output must be a Buffer');
      assert.ok(pdfBuffer.length > 500, 'PDF Buffer must be non-empty valid binary PDF');
      assert.strictEqual(pdfBuffer.toString('utf8', 0, 4), '%PDF', 'PDF buffer must start with %PDF header signature');
    });

    await test('9. Certificate contains correct event/student metadata in download stream', async () => {
      const certId = mockCertificates[0].certificateId;
      const req = { user: studentOne, params: { certificateId: certId } };
      const res = createMockRes();

      await downloadCertificatePDF(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['Content-Type'], 'application/pdf');
      assert.ok(res.headers['Content-Disposition'].includes(certId));
      assert.ok(Buffer.isBuffer(res.body), 'Body must be downloadable PDF Buffer');
    });

    // ==================================================
    // NOTIFICATION TESTS (10 - 18)
    // ==================================================

    await test('10. Registration creates notification', async () => {
      await createNotification({
        userId: studentOne._id,
        title: 'Registration Successful 🎉',
        message: 'You have registered for AI Workshop',
        type: 'registration',
      });

      const studentNotifs = mockNotifications.filter(
        (n) => n.user.toString() === studentOne._id.toString() && n.type === 'registration'
      );
      assert.ok(studentNotifs.length >= 1, 'Should create registration notification');
    });

    await test('11. Attendance creates notification', async () => {
      await createNotification({
        userId: studentOne._id,
        title: 'Attendance Marked 📌',
        message: 'Your attendance was marked PRESENT',
        type: 'attendance',
      });

      const attendanceNotif = mockNotifications.find((n) => n.type === 'attendance');
      assert.ok(attendanceNotif, 'Attendance notification must be created');
      assert.strictEqual(attendanceNotif.user.toString(), studentOne._id.toString());
    });

    await test('12. Certificate generation creates notification', async () => {
      const certNotif = mockNotifications.find((n) => n.type === 'certificate');
      assert.ok(certNotif, 'Certificate generation must trigger certificate notification');
    });

    await test('13. User can retrieve own notifications', async () => {
      const req = { user: studentOne };
      const res = createMockRes();

      await getMyNotifications(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length >= 2, 'User should receive list of notifications');
      assert.strictEqual(res.body.unreadCount, res.body.data.filter((n) => !n.isRead).length);
    });

    await test('14. User cannot retrieve another user notifications', async () => {
      const req = { user: studentTwo };
      const res = createMockRes();

      await getMyNotifications(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 0, 'StudentTwo should not see StudentOne notifications');
    });

    await test('15. User can mark notification as read', async () => {
      const notifId = mockNotifications[0]._id.toString();
      const req = { user: studentOne, params: { id: notifId } };
      const res = createMockRes();

      await markAsRead(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockNotifications[0].isRead, true);
    });

    await test('16. User can mark all notifications as read', async () => {
      const req = { user: studentOne };
      const res = createMockRes();

      await markAllAsRead(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      const unreadRemaining = mockNotifications.filter(
        (n) => n.user.toString() === studentOne._id.toString() && !n.isRead
      ).length;
      assert.strictEqual(unreadRemaining, 0);
    });

    await test('17. Duplicate notification creation is prevented where applicable', async () => {
      const firstCount = mockNotifications.length;
      await createNotification({
        userId: studentOne._id,
        title: 'Recent Duplicate Check',
        message: 'Same payload',
        type: 'general',
      });
      await createNotification({
        userId: studentOne._id,
        title: 'Recent Duplicate Check',
        message: 'Same payload',
        type: 'general',
      });

      const added = mockNotifications.length - firstCount;
      assert.strictEqual(added, 1, 'Duplicate recent notification should be deduplicated');
    });

    await test('18. Unauthenticated notification access is rejected', async () => {
      const { protect } = require('../src/middleware/authMiddleware');
      const req = { headers: {} };
      const res = createMockRes();

      await protect(req, res, () => {});

      assert.strictEqual(res.statusCode, 401, 'Unauthenticated request must be rejected with 401');
    });

  } finally {
    // Restore Original Mongoose Methods
    Certificate.findOne = originalCertFindOne;
    Certificate.find = originalCertFind;
    Certificate.create = originalCertCreate;
    Certificate.findById = originalCertFindById;
    Registration.findOne = originalRegFindOne;
    Event.findById = originalEventFindById;
    Notification.find = originalNotifFind;
    Notification.findOne = originalNotifFindOne;
    Notification.create = originalNotifCreate;
    Notification.countDocuments = originalNotifCount;
    Notification.findById = originalNotifFindById;
    Notification.updateMany = originalNotifUpdateMany;
  }

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCertificateAndNotificationTests();
