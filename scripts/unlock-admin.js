require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../configs/database');
const userModel = require('../schemas/users');

connectDB().then(async () => {
  try {
    const result = await userModel.updateOne(
      { username: 'admin' },
      { $set: { status: true, lockTime: null, loginCount: 0, isDeleted: false } }
    );
    console.log('Admin Account Unlocked Successfully!', result);
  } catch (err) {
    console.error('Error unlocking admin:', err);
  } finally {
    process.exit(0);
  }
});
