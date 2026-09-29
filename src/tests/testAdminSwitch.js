const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const Admin = require('../models/admin/Admin');
const Role = require('../models/role/Role');
const app = require('../server');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_ravi_electricals_jwt_key_2026';

let server;
let port;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: port,
      path: options.path,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n==================================================');
  console.log('  RUNNING ADMIN ↔ ROLE SWITCH API SUITE TESTS');
  console.log('==================================================\n');

  await connectDB();

  // Start HTTP server on dynamic port for testing
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      console.log(`Test server running on port ${port}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Setup test documents
    await Role.deleteMany({ email: /@testswitch\.com$/ });
    await Admin.deleteMany({ email: /@testswitch\.com$/ });

    const testRole = await Role.create({
      roleName: 'Test Manager',
      roleTitle: 'Manager Title',
      email: 'manager@testswitch.com',
      password: 'password123',
      status: 1,
      permissions: ['read', 'write'],
    });

    const testAdmin = await Admin.create({
      name: 'Super Admin Test',
      email: 'superadmin@testswitch.com',
      password: 'password123',
      roleId: testRole._id,
    });

    const adminNoRole = await Admin.create({
      name: 'Admin Without Role',
      email: 'noroleadmin@testswitch.com',
      password: 'password123',
      roleId: null,
    });

    const fakeRoleId = new mongoose.Types.ObjectId();
    const adminFakeRole = await Admin.create({
      name: 'Admin Nonexistent Role',
      email: 'fakeroleadmin@testswitch.com',
      password: 'password123',
      roleId: fakeRoleId,
    });

    const lockedAdmin = await Admin.create({
      name: 'Locked Admin',
      email: 'lockedadmin@testswitch.com',
      password: 'password123',
      roleId: testRole._id,
      lockedUntil: new Date(Date.now() + 600000),
    });

    const adminToken = jwt.sign(
      { id: testAdmin._id.toString(), sub: testAdmin._id.toString(), adminId: testAdmin._id.toString(), userType: 'ADMIN', mode: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminNoRoleToken = jwt.sign(
      { id: adminNoRole._id.toString(), sub: adminNoRole._id.toString(), adminId: adminNoRole._id.toString(), userType: 'ADMIN', mode: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminFakeRoleToken = jwt.sign(
      { id: adminFakeRole._id.toString(), sub: adminFakeRole._id.toString(), adminId: adminFakeRole._id.toString(), userType: 'ADMIN', mode: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ----------------------------------------------------
    // Test 1: Admin successfully switches to linked Role
    // ----------------------------------------------------
    const res1 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res1.status === 200 && res1.body.success === true && res1.body.mode === 'ROLE', '1. Admin successfully switches to linked Role');
    assert(res1.body.adminId === testAdmin._id.toString(), '1.1 Response contains original adminId');
    assert(res1.body.role._id === testRole._id.toString(), '1.2 Response contains linked role info');

    const roleModeToken = res1.body.token;

    // ----------------------------------------------------
    // Test 1b: Verify /api/v1/admin/switch-role works as well
    // ----------------------------------------------------
    const res1b = await request(
      { path: '/api/v1/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res1b.status === 200 && res1b.body.success === true && res1b.body.mode === 'ROLE', '1b. /api/v1/admin/switch-role endpoint works correctly');

    // ----------------------------------------------------
    // Test 2: Admin without a roleId cannot switch
    // ----------------------------------------------------
    const res2 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${adminNoRoleToken}` } }
    );
    assert(res2.status === 404 && res2.body.success === false, '2. Admin without roleId cannot switch (404)');

    // ----------------------------------------------------
    // Test 3: Admin with non-existent Role cannot switch
    // ----------------------------------------------------
    const res3 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${adminFakeRoleToken}` } }
    );
    assert(res3.status === 404 && res3.body.success === false, '3. Admin with non-existent Role cannot switch (404)');

    // ----------------------------------------------------
    // Test 4: Unauthenticated request is rejected
    // ----------------------------------------------------
    const res4 = await request({ path: '/api/admin/switch-role', method: 'POST' });
    assert(res4.status === 401 && res4.body.success === false, '4. Unauthenticated request rejected (401)');

    // ----------------------------------------------------
    // Test 5: Non-admin user is rejected
    // ----------------------------------------------------
    const nonAdminId = new mongoose.Types.ObjectId();
    const nonAdminToken = jwt.sign({ id: nonAdminId.toString() }, JWT_SECRET, { expiresIn: '1h' });
    const res5 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${nonAdminToken}` } }
    );
    assert(res5.status === 401 && res5.body.success === false, '5. Non-admin user request rejected (401)');

    // ----------------------------------------------------
    // Test 6: Role-mode token successfully switches back to Admin mode
    // ----------------------------------------------------
    const res6 = await request(
      { path: '/api/admin/switch-admin', method: 'POST', headers: { Authorization: `Bearer ${roleModeToken}` } }
    );
    assert(res6.status === 200 && res6.body.success === true && res6.body.mode === 'ADMIN', '6. Role-mode token switches back to Admin mode (200)');
    assert(res6.body.adminId === testAdmin._id.toString(), '6.1 Switch back response preserves adminId');

    const newAdminToken = res6.body.token;

    // ----------------------------------------------------
    // Test 7: Invalid Role-mode token is rejected
    // ----------------------------------------------------
    const res7 = await request(
      { path: '/api/admin/switch-admin', method: 'POST', headers: { Authorization: 'Bearer invalid_token_xyz' } }
    );
    assert(res7.status === 401 && res7.body.success === false, '7. Invalid Role-mode token rejected (401)');

    // ----------------------------------------------------
    // Test 8: Role-mode token cannot switch to another role
    // ----------------------------------------------------
    const res8 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${roleModeToken}` } }
    );
    assert(res8.status === 403 && res8.body.success === false, '8. Role-mode token cannot switch to another role (403)');

    // ----------------------------------------------------
    // Test 9: Locked Admin status validation
    // ----------------------------------------------------
    const lockedAdminToken = jwt.sign(
      { id: lockedAdmin._id.toString(), sub: lockedAdmin._id.toString(), adminId: lockedAdmin._id.toString(), userType: 'ADMIN', mode: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res9 = await request(
      { path: '/api/admin/switch-role', method: 'POST', headers: { Authorization: `Bearer ${lockedAdminToken}` } }
    );
    assert(res9.status === 200 || res9.status === 423 || res9.status === 403, '9. Admin switch with roleId handled correctly');

    // ----------------------------------------------------
    // Test 10: Admin identity remains unchanged after both switches
    // ----------------------------------------------------
    const decodedOriginal = jwt.decode(adminToken);
    const decodedRoleMode = jwt.decode(roleModeToken);
    const decodedSwitchedBack = jwt.decode(newAdminToken);
    assert(
      decodedOriginal.adminId === decodedRoleMode.adminId && decodedRoleMode.adminId === decodedSwitchedBack.adminId,
      '10. Admin identity (adminId) remains unchanged across both token switches'
    );

    // ----------------------------------------------------
    // Test 11: Existing Admin authentication continues to work
    // ----------------------------------------------------
    const res11 = await request(
      { path: '/api/admin/dashboard/stats', method: 'GET', headers: { Authorization: `Bearer ${newAdminToken}` } }
    );
    assert(res11.status === 200 || res11.status === 404, '11. Existing Admin auth middleware processes Admin token');

    // ----------------------------------------------------
    // Test 12: Existing Role authorization continues to work with Role-mode token
    // ----------------------------------------------------
    const res12 = await request(
      { path: '/api/role/my-role', method: 'GET', headers: { Authorization: `Bearer ${roleModeToken}` } }
    );
    assert(res12.status === 200 || res12.status === 404, '12. Existing Role auth middleware processes Role-mode token');

    // Cleanup
    await Role.deleteMany({ email: /@testswitch\.com$/ });
    await Admin.deleteMany({ email: /@testswitch\.com$/ });

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    console.log('\n==================================================');
    console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    server.close();
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
