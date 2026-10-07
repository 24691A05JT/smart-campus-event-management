const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');

const { getUsersForAdmin, getUserByIdForAdmin } = require('../src/controllers/adminController');
const { getAdminAnalyticsController } = require('../src/controllers/analyticsController');
const { approveEvent, rejectEvent, getAllEvents } = require('../src/controllers/eventController');
const { authorize, protect } = require('../src/middleware/authMiddleware');

let passed = 0;
let failed = 0;

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
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

async function runAdminComprehensiveTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 11 ADMIN DASHBOARD & MANAGEMENT TEST SUITE');
  console.log('==================================================\n');

  // Test Users
  const adminUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9d001'),
    name: 'Master Admin',
    email: 'admin@smartcampus.edu',
    role: 'admin',
    department: 'Administration',
  };

  const studentUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9d002'),
    name: 'Student User',
    email: 'student@campus.edu',
    role: 'student',
    department: 'CSE',
  };

  const organizerUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9d003'),
    name: 'Faculty Organizer',
    email: 'faculty@campus.edu',
    role: 'organizer',
    department: 'ECE',
  };

  // Mock Users DB Collection
  const mockUsers = [
    {
      _id: adminUser._id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'admin',
      department: 'Administration',
      isApproved: true,
      createdAt: new Date(),
    },
    {
      _id: studentUser._id,
      name: studentUser.name,
      email: studentUser.email,
      role: 'student',
      department: 'CSE',
      isApproved: true,
      createdAt: new Date(),
    },
    {
      _id: organizerUser._id,
      name: organizerUser.name,
      email: organizerUser.email,
      role: 'organizer',
      department: 'ECE',
      isApproved: true,
      createdAt: new Date(),
    },
  ];

  // Mock Events DB Collection
  const pendingEventId = new mongoose.Types.ObjectId().toString();
  const mockEvents = [
    {
      _id: pendingEventId,
      title: 'Pending Hackathon 2026',
      description: 'Annual campus coding competition',
      category: 'Technical',
      venue: 'Lab 4',
      date: new Date('2026-11-10'),
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      status: 'pending',
      rejectionReason: '',
      registeredCount: 0,
      maxSeats: 100,
      organizer: organizerUser._id,
      save: async function () { return this; },
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      title: 'Approved Cultural Fest',
      category: 'Cultural',
      venue: 'Main Stage',
      status: 'approved',
      organizer: organizerUser._id,
      save: async function () { return this; },
    },
  ];

  // Backup Original Mongoose Methods
  const originalUserFind = User.find;
  const originalUserFindById = User.findById;
  const originalEventFind = Event.find;
  const originalEventFindById = Event.findById;
  const originalRegFind = Registration.find;
  const Feedback = require('../src/models/Feedback');
  const originalFeedbackFind = Feedback.find;

  try {
    // Mongoose Method Overrides
    User.find = (query = {}) => {
      let result = [...mockUsers];
      if (query.role) {
        result = result.filter((u) => u.role === query.role);
      }
      if (query.$or) {
        result = result.filter((u) => {
          return query.$or.some((clause) => {
            if (clause.name) return clause.name.test(u.name);
            if (clause.email) return clause.email.test(u.email);
            if (clause.department) return clause.department.test(u.department);
            return false;
          });
        });
      }

      const chain = {
        select: (fields) => {
          if (fields && fields.includes('-password')) {
            result = result.map((u) => {
              const { password, ...safeUser } = u;
              return safeUser;
            });
          }
          return chain;
        },
        sort: () => Promise.resolve(result),
        then: (cb) => Promise.resolve(result).then(cb),
      };
      return chain;
    };

    User.findById = (id) => {
      const found = mockUsers.find((u) => u._id.toString() === id.toString());
      const chain = {
        select: (fields) => {
          if (found && fields && fields.includes('-password')) {
            const { password, ...safeUser } = found;
            return chain;
          }
          return chain;
        },
        then: (cb) => Promise.resolve(found || null).then(cb),
      };
      return chain;
    };

    Event.find = (query = {}) => {
      let list = [...mockEvents];
      if (query.status) {
        list = list.filter((e) => e.status === query.status);
      }
      const resPromise = Promise.resolve(list);
      resPromise.populate = () => resPromise;
      resPromise.sort = () => resPromise;
      return resPromise;
    };

    Registration.find = () => {
      const list = [];
      const resPromise = Promise.resolve(list);
      resPromise.populate = () => resPromise;
      return resPromise;
    };

    const Feedback = require('../src/models/Feedback');
    const originalFeedbackFind = Feedback.find;
    Feedback.find = () => Promise.resolve([]);

    Event.findById = (id) => {
      const found = mockEvents.find((e) => e._id.toString() === id.toString());
      return {
        populate: async () => found || null,
        then: (cb) => Promise.resolve(found || null).then(cb),
      };
    };

    const mockNext = (err) => { if (err) throw err; };

    // ==================================================
    // ADMIN RBAC & USER MANAGEMENT TESTS (1 - 5)
    // ==================================================

    await test('1. Admin can access admin dashboard & analytics data', async () => {
      const req = { user: adminUser };
      const res = createMockRes();

      await getAdminAnalyticsController(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.role, 'admin');
    });

    await test('2. Student cannot access admin user API (403)', async () => {
      const req = { user: studentUser };
      const res = createMockRes();
      let nextCalled = false;

      const middleware = authorize('admin');
      middleware(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    await test('3. Organizer cannot access admin user API (403)', async () => {
      const req = { user: organizerUser };
      const res = createMockRes();
      let nextCalled = false;

      const middleware = authorize('admin');
      middleware(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    await test('4. Admin can retrieve safe user list (200)', async () => {
      const req = { user: adminUser, query: {} };
      const res = createMockRes();

      await getUsersForAdmin(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 3);
    });

    await test('5. Password fields are never returned in admin user list', async () => {
      const req = { user: adminUser, query: {} };
      const res = createMockRes();

      await getUsersForAdmin(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      res.body.data.forEach((u) => {
        assert.strictEqual(u.password, undefined, 'Password field must not be present');
      });
    });

    // ==================================================
    // ADMIN EVENT MANAGEMENT & APPROVAL TESTS (6 - 11)
    // ==================================================

    await test('6. Admin can retrieve all campus events', async () => {
      const req = { user: adminUser };
      const res = createMockRes();

      await getAllEvents(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 2);
    });

    await test('7. Admin search & role filter parameters work correctly', async () => {
      const req = { user: adminUser, query: { role: 'student' } };
      const res = createMockRes();

      await getUsersForAdmin(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data[0].role, 'student');
    });

    await test('8. Admin can approve a pending event', async () => {
      const req = { user: adminUser, params: { id: pendingEventId } };
      const res = createMockRes();

      await approveEvent(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(mockEvents[0].status, 'approved');
    });

    await test('9. Admin can reject a pending event with rejection reason', async () => {
      mockEvents[0].status = 'pending';
      const req = {
        user: adminUser,
        params: { id: pendingEventId },
        body: { rejectionReason: 'Schedule conflict with university orientation.' },
      };
      const res = createMockRes();

      await rejectEvent(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(mockEvents[0].status, 'rejected');
      assert.strictEqual(mockEvents[0].rejectionReason, 'Schedule conflict with university orientation.');
    });

    await test('10. Student cannot approve/reject events (403)', async () => {
      const req = { user: studentUser };
      const res = createMockRes();
      let nextCalled = false;

      const middleware = authorize('admin');
      middleware(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    await test('11. Organizer cannot approve/reject events (403)', async () => {
      const req = { user: organizerUser };
      const res = createMockRes();
      let nextCalled = false;

      const middleware = authorize('admin');
      middleware(req, res, () => { nextCalled = true; });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    // ==================================================
    // ADMIN ANALYTICS & SECURITY TESTS (12 - 14)
    // ==================================================

    await test('12. Admin analytics remains accessible to admin role', async () => {
      const req = { user: adminUser };
      const res = createMockRes();

      await getAdminAnalyticsController(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
    });

    await test('13. Admin can retrieve single user details cleanly', async () => {
      const req = { user: adminUser, params: { id: studentUser._id.toString() } };
      const res = createMockRes();

      await getUserByIdForAdmin(req, res, mockNext);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, studentUser.name);
    });

    await test('14. Unauthenticated admin requests are rejected with 401', async () => {
      const req = { headers: {} };
      const res = createMockRes();

      await protect(req, res, () => {});

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

  } finally {
    User.find = originalUserFind;
    User.findById = originalUserFindById;
    Event.find = originalEventFind;
    Event.findById = originalEventFindById;
    Registration.find = originalRegFind;
    const FeedbackModel = require('../src/models/Feedback');
    FeedbackModel.find = originalFeedbackFind;
  }

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminComprehensiveTests();
