const mongoose = require('mongoose');
const config = require('../configs');

mongoose.connect(config.MONGODB_URI)
  .then(async () => {
    console.log('Connected. Dropping stale index orderNumber_1 from orders collection...');
    try {
      await mongoose.connection.db.collection('orders').dropIndex('orderNumber_1');
      console.log('✅ Index orderNumber_1 dropped successfully!');
    } catch (e) {
      if (e.code === 27) {
        console.log('ℹ️  Index does not exist (already clean).');
      } else {
        console.error('❌ Error:', e.message);
      }
    }
    await mongoose.disconnect();
    console.log('Done. You can restart the server.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
