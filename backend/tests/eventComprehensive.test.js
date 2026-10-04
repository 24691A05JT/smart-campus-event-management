const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { protect, authorize } = require('../src/middleware/authMiddleware');
const {
  createEvent,
  getApprovedEvents,
  getMyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent,
} = require('../src/controllers/eventController');
const Event = require('../src/models/Event');
const { doTimesOverlap } = require('../src/utils/timeUtils');

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

async function runEventTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 4 EVENT CRUD & RBAC TEST SUITE');
  console.log('==================================================\n');

  const organizerUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Prof. Smith',
    role: 'organizer',
    department: 'CSE',
  };

  const organizerTwo = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d9'),
    name: 'Prof. Jones',
    role: 'organizer',
    department: 'ECE',
  };

  const studentUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    name: 'Student Alice',
    role: 'student',
    department: 'CSE',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    name: 'Admin Dean',
    role: 'admin',
    department: 'Administration',
  };

  // 1. RBAC: Organizer allowed to create event route
  await test('1. RBAC: Organizer allowed to access create event route', async () => {
    const middleware = authorize('organizer');
    const req = { user: organizerUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  // 2. RBAC: Student cannot access create event route
  await test('2. RBAC: Student denied access to create event route (403)', async () => {
    const middleware = authorize('organizer');
    const req = { user: studentUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 3. RBAC: Admin denied when route specifically requires organizer
  await test('3. RBAC: Admin denied when route specifically requires organizer (403)', async () => {
    const middleware = authorize('organizer');
    const req = { user: adminUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 4. Validation: Missing required fields
  await test('4. Validation: Create event returns 400 when required fields missing', async () => {
    const req = {
      user: organizerUser,
      body: { title: 'Incomplete Event' },
    };
    const res = createMockRes();
    await createEvent(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  // 5. Validation: Invalid time range
  await test('5. Validation: Create event returns 400 when end time <= start time', async () => {
    const req = {
      user: organizerUser,
      body: {
        title: 'Reverse Time Event',
        description: 'Test Description',
        category: 'Technical',
        venue: 'Auditorium',
        date: '2026-10-20',
        startTime: '02:00 PM',
        endTime: '10:00 AM',
        registrationLimit: 50,
      },
    };
    const res = createMockRes();
    await createEvent(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('after start time'));
  });

  // 6. Time Utils: Contiguous time intervals non-overlap validation
  await test('6. Time Utils: Contiguous time intervals do not overlap (10:00-12:00 vs 12:00-14:00)', async () => {
    const overlap = doTimesOverlap('10:00 AM', '12:00 PM', '12:00 PM', '02:00 PM');
    assert.strictEqual(overlap, false);
  });

  // 7. Time Utils: Overlapping interval detection
  await test('7. Time Utils: Overlapping time intervals detected (10:00-12:00 vs 11:00-13:00)', async () => {
    const overlap = doTimesOverlap('10:00 AM', '12:00 PM', '11:00 AM', '01:00 PM');
    assert.strictEqual(overlap, true);
  });

  // 8. Organizer ownership update restriction
  await test('8. Ownership: Organizer cannot update another organizer event (403)', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { id: validId },
      user: organizerTwo,
      body: { title: 'Unauthorized Modification' },
    };
    const res = createMockRes();
    const originalFind = Event.findById;
    Event.findById = async () => ({
      _id: validId,
      organizer: organizerUser._id,
      venue: 'Lab A',
      date: new Date(),
      startTime: '10:00 AM',
      endTime: '12:00 PM',
    });

    try {
      await updateEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('Not authorized'));
    } finally {
      Event.findById = originalFind;
    }
  });

  // 9. Organizer ownership delete restriction
  await test('9. Ownership: Organizer cannot delete another organizer event (403)', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { id: validId },
      user: organizerTwo,
    };
    const res = createMockRes();
    const originalFind = Event.findById;
    Event.findById = async () => ({
      _id: validId,
      organizer: organizerUser._id,
    });

    try {
      await deleteEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
    } finally {
      Event.findById = originalFind;
    }
  });

  // 10. Student view unapproved event protection
  await test('10. Security: Student accessing pending event receives 404', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { id: validId },
      user: studentUser,
    };
    const res = createMockRes();
    const originalFind = Event.findById;
    Event.findById = () => ({
      populate: () => ({
        _id: validId,
        status: 'pending',
        organizer: organizerUser._id,
      }),
    });

    try {
      await getEventById(req, res, () => {});
      assert.strictEqual(res.statusCode, 404);
    } finally {
      Event.findById = originalFind;
    }
  });

  // 11. Admin approve endpoint
  await test('11. Admin Approval: Admin can approve an event (200 & status=approved)', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { id: validId },
      user: adminUser,
    };
    const res = createMockRes();
    const originalFind = Event.findById;
    let savedStatus = null;
    Event.findById = async () => ({
      _id: validId,
      status: 'pending',
      save: async function () { savedStatus = this.status; },
    });

    try {
      await approveEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(savedStatus, 'approved');
    } finally {
      Event.findById = originalFind;
    }
  });

  // 12. Admin reject endpoint
  await test('12. Admin Rejection: Admin can reject an event (200 & status=rejected)', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { id: validId },
      user: adminUser,
      body: { rejectionReason: 'Venue unavailable on target day' },
    };
    const res = createMockRes();
    const originalFind = Event.findById;
    let savedStatus = null;
    Event.findById = async () => ({
      _id: validId,
      status: 'pending',
      save: async function () { savedStatus = this.status; },
    });

    try {
      await rejectEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(savedStatus, 'rejected');
    } finally {
      Event.findById = originalFind;
    }
  });

  // 13. Organizer cannot access admin approve route
  await test('13. RBAC: Organizer cannot access admin approval route (403)', async () => {
    const middleware = authorize('admin');
    const req = { user: organizerUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 14. Invalid ObjectId format handling
  await test('14. Validation: Invalid ObjectId format returns 404', async () => {
    const req = { params: { id: 'invalid-id-format' } };
    const res = createMockRes();
    await getEventById(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runEventTests();
