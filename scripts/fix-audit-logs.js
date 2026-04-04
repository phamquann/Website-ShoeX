require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../configs/database');
const auditLogModel = require('../schemas/auditLogs');

connectDB().then(async () => {
  try {
    const logs = await auditLogModel.find({ 
      action: { $in: ['LOGIN', 'REGISTER', 'LOGIN_FAILED', 'LOGIN_FAILED_LOCKED'] }, 
      user: null 
    });
    
    for (let log of logs) {
      if (log.resourceId) {
        log.user = log.resourceId;
        await log.save();
      }
    }
    console.log(`Successfully fixed ${logs.length} previous audit logs!`);
  } catch (err) {
    console.error('Error fixing logs:', err);
  } finally {
    process.exit(0);
  }
});
