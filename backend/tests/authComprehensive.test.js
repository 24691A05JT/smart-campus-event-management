const assert = require('assert');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '../.env') });

const generateToken = require('../src/utils/generateToken');
const { protect, authorize } = require('../src/middleware/authMiddleware');
const { registerUser, loginUser, getMe } = require('../src/controllers/authController');

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

async function runAuthTests() {
  console.log('\n==================================================');
  console.log('🧪 COMPREHENSIVE DAY 3 AUTHENTICATION TEST SUITE');
  console.log('==================================================\n');

  // 1. Password Hashing & Verification
  await test('Security: Bcryptjs hashes password cleanly', async () => {
    const raw = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(raw, salt);
    assert.notStrictEqual(raw, hashed);
    assert.strictEqual(await bcrypt.compare(raw, hashed), true);
    assert.strictEqual(await bcrypt.compare('WrongPass', hashed), false);
  });

  // 2. JWT Generation & Verification
  await test('Security: JWT Token generation & payload verification', async () => {
    const userId = '65f1a2b3c4d5e6f7a8b9c0d1';
    const role = 'student';
    const token = generateToken(userId, role);
    assert.ok(token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    assert.strictEqual(decoded.id, userId);
    assert.strictEqual(decoded.role, role);
  });

  // 3. Validation: Missing required fields
  await test('Validation: Register rejects missing required fields (400)', async () => {
    const req = { body: { name: 'John Doe', email: 'john@example.com' } };
    const res = createMockRes();
    await registerUser(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
  });

  // 4. Validation: Invalid email format
  await test('Validation: Register rejects invalid email format (400)', async () => {
    const req = {
      body: {
        name: 'John Doe',
        email: 'invalid-email-format',
        password: 'Password123!',
        department: 'CSE',
      },
    };
    const res = createMockRes();
    await registerUser(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('valid email'));
  });

  // 5. Security: Disallow public registration of admin accounts
  await test('Security: Reject public admin account registration attempt (400)', async () => {
    const req = {
      body: {
        name: 'Admin Attacker',
        email: 'attacker@smartcampus.edu',
        password: 'Password123!',
        role: 'admin',
        department: 'Administration',
      },
    };
    const res = createMockRes();
    await registerUser(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('admin accounts is not allowed'));
  });

  // 6. Auth Middleware: Missing Bearer Token
  await test('Auth Middleware: Rejects request with missing Bearer token (401)', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body.message.includes('no bearer token provided'));
  });

  // 7. Auth Middleware: Invalid JWT Token
  await test('Auth Middleware: Rejects invalid JWT token signature (401)', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.str' } };
    const res = createMockRes();
    let nextCalled = false;
    await protect(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  // 8. RBAC Middleware: Role Protection
  await test('RBAC: Allows authorized role (student for student route)', async () => {
    const middleware = authorize('student');
    const req = { user: { role: 'student' } };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await test('RBAC: Denies unauthorized role (student trying to access admin route) (403)', async () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'student' } };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.body.message.includes('not authorized'));
  });

  await test('RBAC: Denies unauthorized role (organizer trying to access admin route) (403)', async () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'organizer' } };
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
  });

  // 9. GET /api/auth/me Profile Return
  await test('GET /api/auth/me: Returns authenticated user profile without password', async () => {
    const req = {
      user: {
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        name: 'Test Student',
        email: 'student@smartcampus.edu',
        role: 'student',
        department: 'CSE',
        interests: ['Coding'],
      },
    };
    const res = createMockRes();
    await getMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.email, 'student@smartcampus.edu');
    assert.strictEqual(res.body.user.password, undefined);
  });

  console.log('\n==================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runAuthTests();
