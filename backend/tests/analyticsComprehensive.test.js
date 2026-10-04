const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { authorize } = require('../src/middleware/authMiddleware');
const {
  getOrganizerAnalyticsController,
  getAdminAnalyticsController,
  getAnalytics,
} = require('../src/controllers/analyticsController');
const {
  getOrganizerAnalytics,
  getAdminAnalytics,
} = require('../src/services/analyticsService');

const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Feedback = require('../src/models/Feedback');
const User = require('../src/models/User');

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

async function runTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 9 ANALYTICS & DASHBOARDS TEST SUITE');
  console.log('==================================================\n');

  const organizerOne = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Prof. Turing',
    role: 'organizer',
    department: 'CSE',
  };

  const organizerTwo = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d2'),
    name: 'Prof. Lovelace',
    role: 'organizer',
    department: 'ECE',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d3'),
    name: 'Master Admin',
    role: 'admin',
  };

  const studentUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d4'),
    name: 'Alice Student',
    role: 'student',
  };

  const eventOneId = new mongoose.Types.ObjectId();
  const eventTwoId = new mongoose.Types.ObjectId();

  // Helper mocks
  const mockEvtFind = (data = []) => async () => data;
  const mockRegFind = (data = []) => () => ({
    populate: async () => data,
  });
  const mockFbFind = (data = []) => async () => data;
  const mockUserFind = (data = []) => async () => data;

  // 1. RBAC: Organizer allowed to access organizer analytics
  await test('1. RBAC: Organizer allowed to access organizer analytics', async () => {
    const middleware = authorize('organizer', 'admin');
    const req = { user: organizerOne };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  // 2. RBAC: Student denied access to analytics endpoint (403)
  await test('2. RBAC: Student denied access to analytics endpoint (403)', async () => {
    const middleware = authorize('organizer', 'admin');
    const req = { user: studentUser };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 3. Controller RBAC: Student rejected by controller (403)
  await test('3. Controller: Student rejected when requesting analytics (403)', async () => {
    const req = { user: studentUser };
    const res = createMockRes();

    await getAnalytics(req, res, () => {});
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.body.message.includes('Forbidden'));
  });

  // 4. Organizer analytics contains only that organizer's events
  await test("4. Security: Organizer analytics query filters by organizer's ID", async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    let queriedOrgId = null;

    Event.find = (query) => {
      queriedOrgId = query.organizer.toString();
      return [
        { _id: eventOneId, title: 'Org 1 Event', status: 'approved', category: 'Technical' },
      ];
    };
    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(queriedOrgId, organizerOne._id.toString());
      assert.strictEqual(data.summary.totalEvents, 1);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 5. Admin can access global analytics (200)
  await test('5. Security: Admin can access global analytics (200)', async () => {
    const req = { user: adminUser };
    const res = createMockRes();

    const origFindUser = User.find;
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    User.find = mockUserFind([
      { role: 'student', department: 'CSE' },
      { role: 'organizer', department: 'ECE' },
      { role: 'admin' },
    ]);

    Event.find = () => ({
      populate: async () => [
        { _id: eventOneId, title: 'Hackathon', status: 'approved', category: 'Technical', registeredCount: 50 },
      ],
    });

    Registration.find = () => ({
      populate: async () => [],
    });

    Feedback.find = mockFbFind([]);

    try {
      await getAdminAnalyticsController(req, res, (err) => {
        if (err) throw err;
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.role, 'admin');
      assert.strictEqual(res.body.data.summary.totalUsers, 3);
      assert.strictEqual(res.body.data.summary.totalStudents, 1);
    } finally {
      User.find = origFindUser;
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 6. Total event count is correct
  await test('6. Metrics: Total event count aggregated correctly', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, title: 'Event A', status: 'approved', category: 'Technical' },
      { _id: eventTwoId, title: 'Event B', status: 'pending', category: 'Cultural' },
    ]);
    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.summary.totalEvents, 2);
      assert.strictEqual(data.summary.approvedEvents, 1);
      assert.strictEqual(data.summary.pendingEvents, 1);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 7. Registration count is correct
  await test('7. Metrics: Registration count aggregated correctly', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, title: 'Event A', status: 'approved', category: 'Technical' },
    ]);

    Registration.find = mockRegFind([
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'present' },
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'absent' },
    ]);

    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.summary.totalRegistrations, 2);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 8. Attendance count & rate calculated correctly
  await test('8. Metrics: Attendance count and attendance rate calculated correctly', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, title: 'Event A', status: 'approved', category: 'Technical' },
    ]);

    Registration.find = mockRegFind([
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'present' },
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'present' },
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'present' },
      { event: { _id: eventOneId }, status: 'registered', attendanceStatus: 'absent' },
    ]);

    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.summary.presentCount, 3);
      assert.strictEqual(data.summary.absentCount, 1);
      assert.strictEqual(data.summary.attendanceRate, 75.0); // (3/4) * 100 = 75%
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 9. Average rating calculated correctly
  await test('9. Metrics: Average rating calculated correctly', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, title: 'Event A', status: 'approved', category: 'Technical' },
    ]);
    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([
      { event: eventOneId, rating: 5 },
      { event: eventOneId, rating: 4 },
    ]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.summary.averageRating, 4.5);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 10. Popular events ranked correctly
  await test('10. Ranking: Popular events ranked correctly by registrations', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, title: 'Low Event', status: 'approved', category: 'Technical', maxSeats: 100 },
      { _id: eventTwoId, title: 'High Event', status: 'approved', category: 'Technical', maxSeats: 100 },
    ]);

    Registration.find = mockRegFind([
      { event: { _id: eventTwoId }, status: 'registered' },
      { event: { _id: eventTwoId }, status: 'registered' },
      { event: { _id: eventOneId }, status: 'registered' },
    ]);

    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.popularEvents[0].title, 'High Event');
      assert.strictEqual(data.popularEvents[0].registeredCount, 2);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 11. Category statistics calculated correctly
  await test('11. Distribution: Category statistics aggregated correctly', async () => {
    const origFindEvt = Event.find;
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;

    Event.find = mockEvtFind([
      { _id: eventOneId, category: 'Technical' },
      { _id: eventTwoId, category: 'Technical' },
      { _id: new mongoose.Types.ObjectId(), category: 'Cultural' },
    ]);

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      const techStat = data.categoryStats.find((c) => c.category === 'Technical');
      assert.strictEqual(techStat.count, 2);
    } finally {
      Event.find = origFindEvt;
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
    }
  });

  // 12. Empty dataset handled safely
  await test('12. Safety: Empty dataset handled safely without zero division errors', async () => {
    const origFindEvt = Event.find;

    Event.find = mockEvtFind([]);

    try {
      const data = await getOrganizerAnalytics(organizerOne._id);
      assert.strictEqual(data.summary.totalEvents, 0);
      assert.strictEqual(data.summary.attendanceRate, 0);
      assert.strictEqual(data.summary.averageRating, 0);
    } finally {
      Event.find = origFindEvt;
    }
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
