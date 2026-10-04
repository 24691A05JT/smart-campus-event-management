const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { authorize } = require('../src/middleware/authMiddleware');
const {
  submitFeedback,
  getEventFeedback,
  getMyFeedback,
} = require('../src/controllers/feedbackController');
const { getRecommendations } = require('../src/controllers/recommendationController');
const { getPersonalizedRecommendations } = require('../src/services/recommendationService');

const Feedback = require('../src/models/Feedback');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');

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
  console.log('🧪 COMPREHENSIVE DAY 8 RECOMMENDATIONS & FEEDBACK TEST SUITE');
  console.log('==================================================\n');

  const studentUser = {
    _id: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'),
    name: 'Alice Student',
    role: 'student',
    department: 'CSE',
    interests: ['Coding', 'Technical', 'Robotics'],
  };

  const eventOneId = new mongoose.Types.ObjectId().toString();

  // Helper mock functions for chainable queries
  const mockRegFind = (data = []) => () => ({ populate: async () => data });
  const mockFbFind = (data = []) => () => ({ populate: async () => data });
  const mockEvtFind = (data = []) => () => ({ populate: async () => data });

  // 1. Submit valid feedback (201)
  await test('1. Feedback: Student can submit valid rating and comment (201)', async () => {
    const req = {
      user: studentUser,
      params: { eventId: eventOneId },
      body: { rating: 5, comments: 'Great technical session!' },
    };
    const res = createMockRes();

    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;
    const origFindFb = Feedback.findOne;
    const origCreateFb = Feedback.create;

    Event.findById = async () => ({ _id: eventOneId, title: 'AI Workshop' });
    Registration.findOne = async () => ({ _id: new mongoose.Types.ObjectId(), status: 'registered' });
    Feedback.findOne = async () => null; // No duplicate
    Feedback.create = async (doc) => ({
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      populate: async function () { return this; },
    });

    try {
      await submitFeedback(req, res, () => {});
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.rating, 5);
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
      Feedback.findOne = origFindFb;
      Feedback.create = origCreateFb;
    }
  });

  // 2. Reject invalid rating (<1 or >5) (400)
  await test('2. Feedback: Rejects invalid rating outside 1-5 range (400)', async () => {
    const req = {
      user: studentUser,
      params: { eventId: eventOneId },
      body: { rating: 10, comments: 'Invalid rating' },
    };
    const res = createMockRes();

    await submitFeedback(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('between 1 and 5'));
  });

  // 3. Reject feedback from unregistered student (400)
  await test('3. Feedback: Rejects feedback from unregistered student (400)', async () => {
    const req = {
      user: studentUser,
      params: { eventId: eventOneId },
      body: { rating: 4 },
    };
    const res = createMockRes();

    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;

    Event.findById = async () => ({ _id: eventOneId });
    Registration.findOne = async () => null; // Not registered!

    try {
      await submitFeedback(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('must be registered'));
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
    }
  });

  // 4. Reject duplicate feedback (400)
  await test('4. Feedback: Rejects duplicate feedback for same event (400)', async () => {
    const req = {
      user: studentUser,
      params: { eventId: eventOneId },
      body: { rating: 5 },
    };
    const res = createMockRes();

    const origFindEvent = Event.findById;
    const origFindReg = Registration.findOne;
    const origFindFb = Feedback.findOne;

    Event.findById = async () => ({ _id: eventOneId });
    Registration.findOne = async () => ({ status: 'registered' });
    Feedback.findOne = async () => ({ _id: new mongoose.Types.ObjectId(), rating: 5 }); // Already exists!

    try {
      await submitFeedback(req, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('already submitted feedback'));
    } finally {
      Event.findById = origFindEvent;
      Registration.findOne = origFindReg;
      Feedback.findOne = origFindFb;
    }
  });

  // 5. Retrieve feedback and average rating (200)
  await test('5. Feedback: Get event feedback calculates average rating correctly (200)', async () => {
    const req = { params: { eventId: eventOneId } };
    const res = createMockRes();

    const origFindFb = Feedback.find;
    Feedback.find = () => ({
      populate: () => ({
        sort: async () => [
          { rating: 5, comments: 'Awesome' },
          { rating: 4, comments: 'Good' },
        ],
      }),
    });

    try {
      await getEventFeedback(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.averageRating, 4.5);
      assert.strictEqual(res.body.totalFeedbackCount, 2);
    } finally {
      Feedback.find = origFindFb;
    }
  });

  // 6. Logged-in student retrieves own feedback (200)
  await test('6. Feedback: Student retrieves own submitted feedback list (200)', async () => {
    const req = { user: studentUser };
    const res = createMockRes();

    const origFindFb = Feedback.find;
    Feedback.find = () => ({
      populate: () => ({
        sort: async () => [
          { _id: new mongoose.Types.ObjectId(), student: studentUser._id, rating: 5 },
        ],
      }),
    });

    try {
      await getMyFeedback(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.count, 1);
    } finally {
      Feedback.find = origFindFb;
    }
  });

  // 7. Authenticated student receives recommendations (200)
  await test('7. Recommendation: Controller returns recommendations for authenticated student (200)', async () => {
    const req = { user: studentUser };
    const res = createMockRes();

    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Campus Coding Hackathon',
        category: 'Technical',
        targetDepartments: ['CSE'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 20,
      },
    ]);

    try {
      await getRecommendations(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length >= 1);
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 8. Department match score (+30)
  await test('8. Scoring: Department match adds +30 points', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'CSE Annual Meet',
        category: 'Seminar',
        targetDepartments: ['CSE'], // Matches student's CSE department
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.ok(recs[0].score >= 30);
      assert.ok(recs[0].reason.includes('matches your department'));
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 9. Interest match score (+30)
  await test('9. Scoring: Interest match adds +30 points', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Robotics Workshop',
        category: 'Robotics', // Matches student's interest 'Robotics'
        targetDepartments: ['ME'], // Non-matching department
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.ok(recs[0].score >= 30);
      assert.ok(recs[0].reason.includes('aligns with your interests'));
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 10. Previous participation score (+20)
  await test('10. Scoring: Previous event participation adds +20 points', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([
      {
        student: studentUser._id,
        event: { _id: new mongoose.Types.ObjectId(), category: 'Cultural' },
        status: 'registered',
      },
    ]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Music Festival',
        category: 'Cultural', // Same category as past registration
        targetDepartments: ['MBA'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.ok(recs[0].score >= 20);
      assert.ok(recs[0].reason.includes('matches your past activity'));
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 11. High rating preference score (+10)
  await test('11. Scoring: High rating category preference adds +10 points', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([
      {
        student: studentUser._id,
        rating: 5,
        event: { _id: new mongoose.Types.ObjectId(), category: 'Sports' },
      },
    ]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Inter-College Football',
        category: 'Sports',
        targetDepartments: ['MBA'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.ok(recs[0].score >= 10);
      assert.ok(recs[0].reason.includes('rated highly'));
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 12. Event popularity score (+10)
  await test('12. Scoring: Event popularity adds points', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Mega Concert',
        category: 'Music',
        targetDepartments: ['MBA'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 80, // High popularity
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.ok(recs[0].score > 0);
      assert.ok(recs[0].reason.includes('popular among campus peers'));
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 13. Exclude already registered events
  await test('13. Filter: Already registered events are excluded from recommendations', async () => {
    const alreadyRegisteredId = new mongoose.Types.ObjectId();

    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([
      {
        student: studentUser._id,
        event: { _id: alreadyRegisteredId, category: 'Technical' },
        status: 'registered',
      },
    ]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: alreadyRegisteredId, // Already registered!
        title: 'Already Registered Hackathon',
        category: 'Technical',
        status: 'approved',
        date: new Date(Date.now() + 86400000),
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 0); // Excluded!
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 14. Exclude expired events
  await test('14. Filter: Expired events are excluded by query date filter', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = (query) => {
      // Check query includes date filter
      assert.ok(query.date && query.date.$gte);
      return {
        populate: async () => [],
      };
    };

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 0);
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 15. Sort recommendations by score descending
  await test('15. Sorting: Recommendations are sorted by score descending', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Low Match Event',
        category: 'Unrelated',
        targetDepartments: ['ME'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'High Match Coding Event',
        category: 'Coding', // Matches interest (+30) + Dept CSE (+30) = 60+
        targetDepartments: ['CSE'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 10,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 2);
      assert.ok(recs[0].score >= recs[1].score);
      assert.strictEqual(recs[0].event.title, 'High Match Coding Event');
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 16. Maximum score capped at 100
  await test('16. Cap: Maximum total recommendation score is capped at 100', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([
      {
        student: studentUser._id,
        event: { _id: new mongoose.Types.ObjectId(), category: 'Coding' },
        status: 'registered',
      },
    ]);
    Feedback.find = mockFbFind([
      {
        student: studentUser._id,
        rating: 5,
        event: { _id: new mongoose.Types.ObjectId(), category: 'Coding' },
      },
    ]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Super Coding Event',
        category: 'Coding', // Matches Dept (+30), Interest (+30), Past (+20), High Rating (+10), Popularity (+10) = 100 pts
        targetDepartments: ['CSE'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 100,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.strictEqual(recs[0].score, 100);
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 17. Reason string generated
  await test('17. Reason: Recommendation items include explainable reason string', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);
    Event.find = mockEvtFind([
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'Robotics Expo',
        category: 'Robotics',
        targetDepartments: ['CSE'],
        status: 'approved',
        date: new Date(Date.now() + 86400000),
        maxSeats: 100,
        registeredCount: 0,
      },
    ]);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 1);
      assert.strictEqual(typeof recs[0].reason, 'string');
      assert.ok(recs[0].reason.length > 10);
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  // 18. Top 5 limit enforced
  await test('18. Limit: Top 5 recommendation limit enforced', async () => {
    const origFindReg = Registration.find;
    const origFindFb = Feedback.find;
    const origFindEvt = Event.find;

    Registration.find = mockRegFind([]);
    Feedback.find = mockFbFind([]);

    const mockEvents = Array.from({ length: 10 }, (_, i) => ({
      _id: new mongoose.Types.ObjectId(),
      title: `Event ${i + 1}`,
      category: 'General',
      targetDepartments: ['All'],
      status: 'approved',
      date: new Date(Date.now() + 86400000),
      maxSeats: 100,
      registeredCount: i * 5,
    }));

    Event.find = mockEvtFind(mockEvents);

    try {
      const recs = await getPersonalizedRecommendations(studentUser);
      assert.strictEqual(recs.length, 5); // Enforces top 5!
    } finally {
      Registration.find = origFindReg;
      Feedback.find = origFindFb;
      Event.find = origFindEvt;
    }
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
