const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const generateToken = require('../src/utils/generateToken');
const { authorize } = require('../src/middleware/authMiddleware');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(testName, testFn) {
  try {
    await testFn();
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}: ${err.message}`);
    testsFailed++;
  }
}

async function runAllUnitTests() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING DATABASE-INDEPENDENT AUTH UNIT TESTS');
  console.log('==================================================\n');

  // Test 1: Bcrypt Password Hashing & Verification
  await runAsyncTest('Bcryptjs - Hash password and verify matching password', async () => {
    const rawPassword = 'SecurePassword123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    assert.notStrictEqual(rawPassword, hashedPassword, 'Hashed password should not equal raw password');
    const isMatch = await bcrypt.compare(rawPassword, hashedPassword);
    assert.strictEqual(isMatch, true, 'bcrypt.compare should return true for correct password');
  });

  await runAsyncTest('Bcryptjs - Verify invalid password rejection', async () => {
    const rawPassword = 'SecurePassword123!';
    const wrongPassword = 'WrongPassword456!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const isMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    assert.strictEqual(isMatch, false, 'bcrypt.compare should return false for wrong password');
  });

  // Test 2: JWT Token Generation & Verification
  runTest('JWT - Generate token with payload and verify signature', () => {
    const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
    const role = 'student';
    const token = generateToken(userId, role);

    assert.ok(token, 'Token should be generated');
    assert.strictEqual(typeof token, 'string', 'Token should be a string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.id, userId, 'Decoded user ID should match');
    assert.strictEqual(decoded.role, role, 'Decoded role should match');
  });

  runTest('JWT - Reject token signed with invalid secret', () => {
    const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
    const role = 'organizer';
    const token = jwt.sign({ id: userId, role }, 'wrong_secret_key');

    assert.throws(() => {
      jwt.verify(token, process.env.JWT_SECRET);
    }, /invalid signature/, 'Verifying token with wrong secret must throw invalid signature error');
  });

  // Test 3: Role-Based Access Control (RBAC) Middleware Logic
  runTest('RBAC - Allow access when user role matches authorized roles', () => {
    const middleware = authorize('admin', 'organizer');
    const req = { user: { role: 'organizer' } };
    const res = {};
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, 'Next function should be called for authorized role');
  });

  runTest('RBAC - Deny access (403 Forbidden) when user role is unauthorized', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'student' } };
    let statusCode = null;
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    middleware(req, res, () => {
      assert.fail('Next should not be called for unauthorized role');
    });

    assert.strictEqual(statusCode, 403, 'HTTP status code should be 403');
    assert.strictEqual(responseBody.success, false, 'Response success should be false');
    assert.ok(responseBody.message.includes('not authorized'), 'Message should indicate unauthorized role');
  });

  runTest('RBAC - Deny access (401 Unauthorized) when user is missing from request', () => {
    const middleware = authorize('student');
    const req = {};
    let statusCode = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        return this;
      },
    };

    middleware(req, res, () => {});

    assert.strictEqual(statusCode, 401, 'HTTP status code should be 401 when req.user missing');
  });

  console.log('\n==================================================');
  console.log(`📊 UNIT TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllUnitTests();
