const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { authorize } = require('../src/middleware/authMiddleware');
const {
  registerForEvent,
  getMyRegistrations,
  checkRegistrationStatus,
  cancelRegistration,
} = require('../src/controllers/registrationController');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');

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

async function runRegistrationTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 6 STUDENT REGISTRATION TEST SUITE');
  console.log('==================================================\n');

  const studentOne = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Alice Student',
    role: 'student',
    department: 'CSE',
  };

  const studentTwo = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    name: 'Bob Student',
    role: 'student',
    department: 'ECE',
  };

  const organizerUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    name: 'Prof. Smith',
    role: 'organizer',
    department: 'CSE',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d4'),
    name: 'Admin Dean',
    role: 'admin',
  };

  const validApprovedEventId = new mongoose.Types.ObjectId().toString();
  const validPendingEventId = new mongoose.Types.ObjectId().toString();
  const validFullEventId = new mongoose.Types.ObjectId().toString();

  // 1. RBAC: Student allowed to register route
  await test('1. RBAC: Student allowed to access registration route', async () => {
    const middleware = authorize('student');
    const req = { user: studentOne };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  // 2. RBAC: Organizer denied access to student registration route (403)
  await test('2. RBAC: Organizer denied access to student registration route (403)', async () => {
    const middleware = authorize('student');
    const req = { user: organizerUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 3. RBAC: Admin denied access to student registration route (403)
  await test('3. RBAC: Admin denied access to student registration route (403)', async () => {
    const middleware = authorize('student');
    const req = { user: adminUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 4. Validation: Invalid or missing event ID (400)
  await test('4. Validation: Registration rejects invalid or missing event ID (400)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: 'invalid-id' },
      body: {},
    };
    const res = createMockRes();
    await registerForEvent(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
  });

  // 5. Validation: Cannot register for unapproved / pending event (400)
  await test('5. Validation: Registration rejects unapproved/pending event (400)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: validPendingEventId },
      body: {},
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    Event.findById = async () => ({
      _id: validPendingEventId,
      status: 'pending',
      maxSeats: 50,
      registeredCount: 0,
    });

    try {
      await registerForEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('not been approved'));
    } finally {
      Event.findById = origFindEvent;
    }
  });

  // 6. Validation: Rejects registration when event capacity is full (400)
  await test('6. Validation: Registration rejects when capacity limit is reached (400)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: validFullEventId },
      body: {},
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    Event.findById = async () => ({
      _id: validFullEventId,
      status: 'approved',
      maxSeats: 10,
      registeredCount: 10,
    });

    try {
      await registerForEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Registration full'));
    } finally {
      Event.findById = origFindEvent;
    }
  });

  // 7. Validation: Rejects duplicate registration attempt (400)
  await test('7. Validation: Registration rejects duplicate student registration (400)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: validApprovedEventId },
      body: {},
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;

    Event.findById = async () => ({
      _id: validApprovedEventId,
      status: 'approved',
      maxSeats: 50,
      registeredCount: 5,
    });

    Registration.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      student: studentOne._id,
      event: validApprovedEventId,
      status: 'registered',
    });

    try {
      await registerForEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('already registered'));
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
    }
  });

  // 8. Successful registration & capacity increment
  await test('8. Success: Student registration creates record & increments registeredCount (201)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: validApprovedEventId },
      body: {},
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;
    const origCreateReg = Registration.create;

    let incrementedCount = 0;

    Event.findById = async () => ({
      _id: validApprovedEventId,
      status: 'approved',
      maxSeats: 50,
      registeredCount: 5,
      save: async function () { incrementedCount = this.registeredCount; },
    });

    Registration.findOne = async () => null;

    Registration.create = async (doc) => ({
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      populate: async function () { return this; },
    });

    try {
      await registerForEvent(req, res, () => {});
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(incrementedCount, 6);
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
      Registration.create = origCreateReg;
    }
  });

  // 9. Student retrieves ONLY their own registrations
  await test('9. Security: Student retrieves ONLY their own registrations (200)', async () => {
    const req = { user: studentOne };
    const res = createMockRes();
    const origFindReg = Registration.find;
    let queriedStudentId = null;

    Registration.find = (query) => {
      queriedStudentId = query.student.toString();
      return {
        populate: () => ({
          sort: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              student: studentOne._id,
              event: { title: 'Coding Contest' },
              status: 'registered',
            },
          ],
        }),
      };
    };

    try {
      await getMyRegistrations(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(queriedStudentId, studentOne._id.toString());
      assert.strictEqual(res.body.count, 1);
    } finally {
      Registration.find = origFindReg;
    }
  });

  // 10. Check registration status endpoint
  await test('10. Status Check: Check registration status returns boolean flag (200)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: validApprovedEventId },
    };
    const res = createMockRes();
    const origFindReg = Registration.findOne;

    Registration.findOne = async () => ({
      student: studentOne._id,
      event: validApprovedEventId,
      status: 'registered',
    });

    try {
      await checkRegistrationStatus(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.isRegistered, true);
    } finally {
      Registration.findOne = origFindReg;
    }
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runRegistrationTests();
