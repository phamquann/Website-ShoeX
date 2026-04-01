const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../configs');
const roleModel = require('../schemas/roles');
const userModel = require('../schemas/users');
const permissionModel = require('../schemas/permissions');

// Connect to DB
mongoose.connect(config.MONGODB_URI)
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => console.error(err));

const seedData = async () => {
  try {
    console.log('--- Clearing old Roles, Users, and Permissions ---');
    await roleModel.deleteMany({});
    await userModel.deleteMany({});
    await permissionModel.deleteMany({});

    console.log('--- Seeding Permissions ---');
    const perms = [
      { resource: 'product', action: 'manage', description: 'Full control over products' },
      { resource: 'product', action: 'read', description: 'Can view products' },
      { resource: 'user', action: 'manage', description: 'Full control over users' }
    ];

    const insertedPerms = [];
    for (const p of perms) {
      const pm = await permissionModel.create({
        name: `${p.action.toUpperCase()}_${p.resource.toUpperCase()}`,
        ...p
      });
      insertedPerms.push(pm);
    }

    console.log('--- Seeding Roles ---');
    // ADMIN has no permissions bounded by check (it bypasses), but we assign them anyway
    const adminRole = await roleModel.create({ name: 'ADMIN', description: 'Super Administrator', permissions: insertedPerms.map(p => p._id) });
    const staffRole = await roleModel.create({ name: 'STAFF', description: 'Staff member' });
    const customerRole = await roleModel.create({ name: 'CUSTOMER', description: 'Normal Customer' });

    console.log('--- Seeding Users ---');
    const salt = bcrypt.genSaltSync(10);
    const hashPwd = bcrypt.hashSync('123456', salt);

    await userModel.create([
      {
        username: 'admin',
        email: 'admin@system.com',
        password: 'admin', // the pre-save hook will hash it
        fullName: 'Admin System',
        phone: '0901234567',
        role: adminRole._id
      },
      {
        username: 'staff01',
        email: 'staff01@system.com',
        password: 'staff',
        fullName: 'Nguyen Van Staff',
        phone: '0912345678',
        role: staffRole._id
      },
      {
        username: 'customer01',
        email: 'customer@test.com',
        password: 'pass',
        fullName: 'Tran Thi Customer',
        phone: '0987654321',
        role: customerRole._id
      }
    ]);

    console.log('✅ Seed completed successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
