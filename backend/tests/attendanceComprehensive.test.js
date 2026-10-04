const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { authorize } = require('../src/middleware/authMiddleware');
const {
  getEventParticipants,
  markAttendance,
} = require('../src/controllers/attendanceController');
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

async function runAttendanceTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 7 ATTENDANCE & PARTICIPANTS TEST SUITE');
  console.log('==================================================\n');

  const organizerOne = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Prof. Alan Turing',
    role: 'organizer',
    department: 'CSE',
  };

  const organizerTwo = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    name: 'Prof. Ada Lovelace',
    role: 'organizer',
    department: 'ECE',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    name: 'Master Admin',
    role: 'admin',
  };

  const studentOne = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d4'),
    name: 'Bob Student',
    role: 'student',
    department: 'CSE',
  };

  const unregisteredStudentId = new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d5').toString();

  const eventOneId = new mongoose.Types.ObjectId().toString();

  // 1. RBAC: Organizer & Admin allowed on participant management route
  await test('1. RBAC: Organizer and Admin allowed access to participant management route', async () => {
    const middleware = authorize('organizer', 'admin');
    const req = { user: organizerOne };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  // 2. RBAC: Student denied access to participant management route (403)
  await test('2. RBAC: Student denied access to participant management route (403)', async () => {
    const middleware = authorize('organizer', 'admin');
    const req = { user: studentOne };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 3. Controller RBAC: Student rejected by getEventParticipants (403)
  await test('3. Controller: Student rejected when requesting event participants (403)', async () => {
    const req = {
      user: studentOne,
      params: { eventId: eventOneId },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    Event.findById = async () => ({
      _id: eventOneId,
      organizer: { _id: organizerOne._id },
      populate: () => ({ _id: eventOneId, organizer: organizerOne }),
    });

    try {
      await getEventParticipants(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('Forbidden'));
    } finally {
      Event.findById = origFindEvent;
    }
  });

  // 4. Organizer can view participants for own event (200)
  await test('4. Security: Organizer can view participants for own event (200)', async () => {
    const req = {
      user: organizerOne,
      params: { eventId: eventOneId },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.find;

    Event.findById = () => ({
      populate: async () => ({
        _id: eventOneId,
        title: 'Hackathon 2026',
        category: 'Technical',
        date: new Date(),
        maxSeats: 100,
        registeredCount: 1,
        organizer: organizerOne,
      }),
    });

    Registration.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              student: studentOne,
              event: eventOneId,
              attendanceStatus: 'unmarked',
              status: 'registered',
            },
          ],
        }),
      }),
    });

    try {
      await getEventParticipants(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.stats.totalRegistered, 1);
    } finally {
      Event.findById = origFindEvent;
      Registration.find = origFindReg;
    }
  });

  // 5. Organizer CANNOT view participants for another organizer's event (403)
  await test('5. Security: Organizer CANNOT view participants for another organizer event (403)', async () => {
    const req = {
      user: organizerTwo, // Different organizer!
      params: { eventId: eventOneId },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;

    Event.findById = () => ({
      populate: async () => ({
        _id: eventOneId,
        organizer: { _id: organizerOne._id, toString: () => organizerOne._id.toString() },
      }),
    });

    try {
      await getEventParticipants(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('only view participants for events you organized'));
    } finally {
      Event.findById = origFindEvent;
    }
  });

  // 6. Admin CAN view participants for any organizer's event (200)
  await test('6. Security: Admin CAN view participants for any event (200)', async () => {
    const req = {
      user: adminUser,
      params: { eventId: eventOneId },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.find;

    Event.findById = () => ({
      populate: async () => ({
        _id: eventOneId,
        title: 'Robotics Workshop',
        organizer: organizerOne,
      }),
    });

    Registration.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: async () => [],
        }),
      }),
    });

    try {
      await getEventParticipants(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
    } finally {
      Event.findById = origFindEvent;
      Registration.find = origFindReg;
    }
  });

  // 7. Organizer marks registered student present (200)
  await test('7. Attendance: Organizer marks registered student as present (200)', async () => {
    const req = {
      user: organizerOne,
      params: { eventId: eventOneId, studentId: studentOne._id.toString() },
      body: { status: 'present' },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;

    Event.findById = async () => ({
      _id: eventOneId,
      organizer: organizerOne._id,
    });

    Registration.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      student: studentOne._id,
      event: eventOneId,
      attendanceStatus: 'unmarked',
      status: 'registered',
      save: async function () { return this; },
      populate: async function () { return this; },
    });

    try {
      await markAttendance(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.attendanceStatus, 'present');
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
    }
  });

  // 8. Organizer marks registered student absent (200)
  await test('8. Attendance: Organizer marks registered student as absent (200)', async () => {
    const req = {
      user: organizerOne,
      params: { eventId: eventOneId, studentId: studentOne._id.toString() },
      body: { status: 'absent' },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;

    Event.findById = async () => ({
      _id: eventOneId,
      organizer: organizerOne._id,
    });

    Registration.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      student: studentOne._id,
      event: eventOneId,
      attendanceStatus: 'present',
      status: 'registered',
      save: async function () { return this; },
      populate: async function () { return this; },
    });

    try {
      await markAttendance(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.attendanceStatus, 'absent');
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
    }
  });

  // 9. Rejects marking attendance for non-registered student (404)
  await test('9. Validation: Cannot mark attendance for non-registered student (404)', async () => {
    const req = {
      user: organizerOne,
      params: { eventId: eventOneId, studentId: unregisteredStudentId },
      body: { status: 'present' },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;

    Event.findById = async () => ({
      _id: eventOneId,
      organizer: organizerOne._id,
    });

    Registration.findOne = async () => null; // Not registered!

    try {
      await markAttendance(req, res, () => {});
      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.body.message.includes('not registered'));
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
    }
  });

  // 10. Organizer CANNOT mark attendance for another organizer's event (403)
  await test('10. Security: Organizer CANNOT mark attendance for another organizer event (403)', async () => {
    const req = {
      user: organizerTwo, // Different organizer!
      params: { eventId: eventOneId, studentId: studentOne._id.toString() },
      body: { status: 'present' },
    };
    const res = createMockRes();
    const origFindEvent = Event.findById;

    Event.findById = async () => ({
      _id: eventOneId,
      organizer: organizerOne._id,
    });

    try {
      await markAttendance(req, res, () => {});
      assert.strictEqual(res.statusCode, 403);
      assert.ok(res.body.message.includes('only mark attendance for your own events'));
    } finally {
      Event.findById = origFindEvent;
    }
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runAttendanceTests();
