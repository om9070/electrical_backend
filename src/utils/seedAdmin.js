const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Admin = require('../models/admin/Admin');
const Role = require('../models/role/Role');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@ravielectricals.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

    // Check if Super Admin role exists
    let adminRole = await Role.findOne({ name: 'Super Admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Super Admin',
        description: 'Super Administrator with full privileges',
        permissions: ['all'],
        status: 1, // Unblocked
      });
      console.log('Super Admin role created');
    }

    // Check if Admin exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin account (${adminEmail}) already exists.`);
    } else {
      await Admin.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: adminRole._id,
        status: 1, // Unblocked/Active
      });
      console.log(`Default Admin account created successfully!`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
