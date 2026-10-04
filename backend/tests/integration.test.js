const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const generateToken = require('../src/utils/generateToken');
const { registerUser, loginUser, getMe } = require('../src/controllers/authController');

let testsPassed = 0;
let testsFailed = 0;

function createMockRes() {
  const res = {
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
  return res;
}

async function runIntegrationTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING AUTH DATABASE INTEGRATION TESTS');
  console.log('==================================================\n');

  const isConnected = await connectDB();

  if (!isConnected || mongoose.connection.readyState !== 1) {
    console.warn('⚠️ [BLOCKED] MongoDB Atlas is not connected or reachable.');
    console.warn('⚠️ Skipping end-to-end database tests. (Database tests reported as BLOCKED).\n');
    return;
  }

  const testEmail = `test_student_${Date.now()}@smartcampus.edu`;
  const testPassword = 'TestPassword123!';
  let createdUserId = null;
  let authToken = null;

  try {
    // 1. Test Signup / Register User
    console.log('1️⃣ Testing POST /api/auth/register...');
    const regReq = {
      body: {
        name: 'Test Student User',
        email: testEmail,
        password: testPassword,
        role: 'student',
        department: 'CSE',
        interests: ['Coding', 'Robotics'],
      },
    };
    const regRes = createMockRes();

    await registerUser(regReq, regRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(regRes.statusCode, 201, 'Registration should return HTTP 201 Created');
    assert.strictEqual(regRes.body.success, true, 'Response success should be true');
    assert.ok(regRes.body.token, 'Token should be returned on registration');
    assert.strictEqual(regRes.body.user.email, testEmail, 'Email should match');
    assert.strictEqual(regRes.body.user.role, 'student', 'Role should be student');
    createdUserId = regRes.body.user._id;
    console.log('  ✅ [PASS] User registration succeeded.');
    testsPassed++;

    // 2. Test Duplicate Registration Prevention
    console.log('2️⃣ Testing duplicate email prevention...');
    const dupRes = createMockRes();
    await registerUser(regReq, dupRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(dupRes.statusCode, 400, 'Duplicate registration should return HTTP 400');
    assert.strictEqual(dupRes.body.success, false, 'Duplicate response success should be false');
    console.log('  ✅ [PASS] Duplicate email registration blocked.');
    testsPassed++;

    // 3. Test Login Endpoint
    console.log('3️⃣ Testing POST /api/auth/login...');
    const loginReq = {
      body: {
        email: testEmail,
        password: testPassword,
      },
    };
    const loginRes = createMockRes();

    await loginUser(loginReq, loginRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(loginRes.statusCode, 200, 'Login should return HTTP 200 OK');
    assert.strictEqual(loginRes.body.success, true, 'Login success should be true');
    assert.ok(loginRes.body.token, 'Login response should contain JWT token');
    authToken = loginRes.body.token;
    console.log('  ✅ [PASS] User login succeeded.');
    testsPassed++;

    // 4. Test Login with Incorrect Password
    console.log('4️⃣ Testing login with invalid password...');
    const badLoginReq = {
      body: {
        email: testEmail,
        password: 'WrongPassword999!',
      },
    };
    const badLoginRes = createMockRes();

    await loginUser(badLoginReq, badLoginRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(badLoginRes.statusCode, 401, 'Invalid password should return HTTP 401');
    assert.strictEqual(badLoginRes.body.success, false);
    console.log('  ✅ [PASS] Invalid password rejected.');
    testsPassed++;

    // 5. Test GET /api/auth/me Endpoint
    console.log('5️⃣ Testing GET /api/auth/me profile fetch...');
    const userDoc = await User.findById(createdUserId).select('-password');
    const meReq = { user: userDoc };
    const meRes = createMockRes();

    await getMe(meReq, meRes, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(meRes.statusCode, 200, 'GET /api/auth/me should return HTTP 200 OK');
    assert.strictEqual(meRes.body.success, true);
    assert.strictEqual(meRes.body.user.email, testEmail);
    console.log('  ✅ [PASS] Profile fetch GET /api/auth/me succeeded.');
    testsPassed++;
  } catch (error) {
    console.error(`  ❌ [FAIL] Integration test failed: ${error.message}`);
    testsFailed++;
  } finally {
    // Cleanup test user
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId);
      console.log('🧹 Cleaned up test user from database.');
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`📊 INTEGRATION TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');
}

runIntegrationTests();
