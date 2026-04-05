const mongoose = require('mongoose');
const config = require('./index');

const hasReplicaSetParam = (uri) => /(?:\?|&)replicaSet=/i.test(uri || '');

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${config.MONGODB_URI}`);

    if (!hasReplicaSetParam(config.MONGODB_URI)) {
      console.warn('⚠️  MONGODB_URI does not include replicaSet=... . Mongo transactions may be unavailable.');
    }

    try {
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      if (hello.setName) {
        console.log(`✅ Replica set detected: ${hello.setName}`);
      } else {
        console.warn('⚠️  Connected MongoDB is not running as replica set. Enable replica set to use transactions safely.');
      }
    } catch (checkError) {
      console.warn(`⚠️  Could not verify replica set status: ${checkError.message}`);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

module.exports = connectDB;
