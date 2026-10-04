const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const generateToken = require('../src/utils/generateToken');
const {
  createEvent,
  getApprovedEvents,
  getMyEvents,
  getPendingEvents,
  updateEvent,
  deleteEvent,
  updateEventStatus,
} = require('../src/controllers/eventController');

let testsPassed = 0;
let testsFailed = 0;

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

async function runEventIntegrationTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING EVENT CRUD & CONFLICT INTEGRATION TESTS');
  console.log('==================================================\n');

  const isConnected = await connectDB();
  if (!isConnected || mongoose.connection.readyState !== 1) {
    console.warn('⚠️ [BLOCKED] MongoDB Atlas is not connected. Skipping integration tests.\n');
    return;
  }

  let organizerUser = null;
  let adminUser = null;
  let studentUser = null;

  let event1Id = null;
  let event3Id = null;

  try {
    // 1. Create test users (Organizer, Admin, Student)
    console.log('1️⃣ Creating test users (Organizer, Admin, Student)...');
    organizerUser = await User.create({
      name: 'Test Organizer',
      email: `organizer_${Date.now()}@smartcampus.edu`,
      password: 'Password123!',
      role: 'organizer',
      department: 'CSE',
    });

    adminUser = await User.create({
      name: 'Test Admin',
      email: `admin_${Date.now()}@smartcampus.edu`,
      password: 'Password123!',
      role: 'admin',
      department: 'ADMIN',
    });

    studentUser = await User.create({
      name: 'Test Student',
      email: `student_${Date.now()}@smartcampus.edu`,
      password: 'Password123!',
      role: 'student',
      department: 'ECE',
    });

    console.log('  ✅ [PASS] Test users created successfully.');
    testsPassed++;

    // 2. Organizer creates Event 1
    console.log('2️⃣ Organizer creating Event 1 (Pending status)...');
    const req1 = {
      user: organizerUser,
      body: {
        title: 'Hackathon 2026',
        description: 'Annual 24-hour campus hackathon',
        category: 'Technical',
        venue: 'Main Auditorium',
        date: '2026-10-15',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        targetDepartments: ['CSE', 'ECE'],
        maxSeats: 100,
      },
    };
    const res1 = createMockRes();

    await createEvent(req1, res1, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res1.statusCode, 201, 'Event 1 creation should return HTTP 201');
    assert.strictEqual(res1.body.data.status, 'pending', 'Event status must be pending');
    assert.strictEqual(res1.body.data.organizer.toString(), organizerUser._id.toString(), 'Organizer ID must match');
    event1Id = res1.body.data._id;
    console.log('  ✅ [PASS] Event 1 created with status pending.');
    testsPassed++;

    // 3. Attempt to create conflicting Event 2 at same venue, date & overlapping time
    console.log('3️⃣ Testing conflict detection for overlapping event at same venue & date...');
    const req2 = {
      user: organizerUser,
      body: {
        title: 'Robotics Workshop',
        description: 'Hands-on robotics session',
        category: 'Workshop',
        venue: 'Main Auditorium',
        date: '2026-10-15',
        startTime: '11:00 AM',
        endTime: '01:00 PM',
        targetDepartments: ['CSE'],
        maxSeats: 50,
      },
    };
    const res2 = createMockRes();

    await createEvent(req2, res2, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res2.statusCode, 409, 'Overlapping event must return HTTP 409 Conflict');
    assert.strictEqual(res2.body.success, false);
    assert.ok(res2.body.message.includes('Venue conflict'), 'Error message must specify venue conflict');
    console.log('  ✅ [PASS] Overlapping event correctly rejected with HTTP 409 Conflict.');
    testsPassed++;

    // 4. Create non-conflicting Event 3 at same venue & date but later time slot
    console.log('4️⃣ Creating non-overlapping Event 3 at same venue later in the day...');
    const req3 = {
      user: organizerUser,
      body: {
        title: 'Cultural Evening',
        description: 'Music and dance performances',
        category: 'Cultural',
        venue: 'Main Auditorium',
        date: '2026-10-15',
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        targetDepartments: ['All'],
        maxSeats: 200,
      },
    };
    const res3 = createMockRes();

    await createEvent(req3, res3, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res3.statusCode, 201, 'Non-overlapping event creation should return HTTP 201');
    event3Id = res3.body.data._id;
    console.log('  ✅ [PASS] Non-overlapping event created successfully.');
    testsPassed++;

    // 5. Verify Student cannot see pending events in public GET /api/events
    console.log('5️⃣ Testing public list GET /api/events excludes pending events...');
    const reqPublic = { query: {} };
    const resPublic = createMockRes();

    await getApprovedEvents(reqPublic, resPublic, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resPublic.statusCode, 200);
    const publicEventIds = resPublic.body.data.map((e) => e._id.toString());
    assert.strictEqual(publicEventIds.includes(event1Id.toString()), false, 'Pending Event 1 must not be public');
    assert.strictEqual(publicEventIds.includes(event3Id.toString()), false, 'Pending Event 3 must not be public');
    console.log('  ✅ [PASS] Public list excludes unapproved pending events.');
    testsPassed++;

    // 6. Verify Organizer sees own pending events in GET /api/events/my-events
    console.log('6️⃣ Testing GET /api/events/my-events returns organizer events...');
    const reqMy = { user: organizerUser };
    const resMy = createMockRes();

    await getMyEvents(reqMy, resMy, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resMy.statusCode, 200);
    const myEventIds = resMy.body.data.map((e) => e._id.toString());
    assert.ok(myEventIds.includes(event1Id.toString()), 'Event 1 should be in organizer list');
    assert.ok(myEventIds.includes(event3Id.toString()), 'Event 3 should be in organizer list');
    console.log('  ✅ [PASS] Organizer successfully fetched own events.');
    testsPassed++;

    // 7. Admin lists pending events
    console.log('7️⃣ Admin fetching pending events GET /api/events/pending...');
    const reqPending = { user: adminUser };
    const resPending = createMockRes();

    await getPendingEvents(reqPending, resPending, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resPending.statusCode, 200);
    const pendingIds = resPending.body.data.map((e) => e._id.toString());
    assert.ok(pendingIds.includes(event1Id.toString()), 'Event 1 should be in pending list');
    console.log('  ✅ [PASS] Admin listed pending events.');
    testsPassed++;

    // 8. Admin approves Event 1
    console.log('8️⃣ Admin approving Event 1...');
    const reqApprove = {
      params: { id: event1Id },
      body: { status: 'approved' },
    };
    const resApprove = createMockRes();

    await updateEventStatus(reqApprove, resApprove, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resApprove.statusCode, 200);
    assert.strictEqual(resApprove.body.data.status, 'approved', 'Event 1 status must now be approved');
    console.log('  ✅ [PASS] Event 1 approved by Admin.');
    testsPassed++;

    // 9. Verify Student can now see approved Event 1
    console.log('9️⃣ Verifying approved Event 1 appears in public listing...');
    const resPublic2 = createMockRes();
    await getApprovedEvents(reqPublic, resPublic2, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resPublic2.statusCode, 200);
    const publicEventIds2 = resPublic2.body.data.map((e) => e._id.toString());
    assert.ok(publicEventIds2.includes(event1Id.toString()), 'Approved Event 1 must now be in public list');
    console.log('  ✅ [PASS] Approved event appears in public listing.');
    testsPassed++;

    // 10. Organizer updates Event 1
    console.log('🔟 Organizer updating Event 1 details...');
    const reqUpdate = {
      params: { id: event1Id },
      user: organizerUser,
      body: {
        title: 'Hackathon 2026 - Extended Edition',
      },
    };
    const resUpdate = createMockRes();

    await updateEvent(reqUpdate, resUpdate, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(resUpdate.statusCode, 200);
    assert.strictEqual(resUpdate.body.data.title, 'Hackathon 2026 - Extended Edition');
    assert.strictEqual(resUpdate.body.data.status, 'pending', 'Updating event should reset status to pending');
    console.log('  ✅ [PASS] Organizer event update succeeded (status reset to pending).');
    testsPassed++;

    // 11. Cleanup test events & users
    console.log('🧹 Cleaning up test events & users...');
    if (event1Id) await Event.findByIdAndDelete(event1Id);
    if (event3Id) await Event.findByIdAndDelete(event3Id);
    if (organizerUser) await User.findByIdAndDelete(organizerUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    if (studentUser) await User.findByIdAndDelete(studentUser._id);

    console.log('  ✅ [PASS] Cleanup complete.');
  } catch (error) {
    console.error(`  ❌ [FAIL] Integration test failed: ${error.message}`);
    testsFailed++;
  } finally {
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`📊 EVENT INTEGRATION TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');
}

runEventIntegrationTests();
