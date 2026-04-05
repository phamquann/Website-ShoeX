const mongoose = require('mongoose');
const config = require('../configs');

mongoose.connect(config.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const allCols = await db.listCollections().toArray();
  console.log('=== ALL UNIQUE INDEXES ===');
  for (const c of allCols) {
    try {
      const indexes = await db.collection(c.name).indexes();
      indexes.forEach(i => {
        if (i.unique && i.name !== '_id_') {
          console.log(c.name + ' | ' + i.name);
        }
      });
    } catch(e) {}
  }

  // Drop all known stale indexes
  const toDrop = [
    { col: 'orders', idx: 'orderNumber_1' },
    { col: 'transactions', idx: 'transactionNumber_1' },
    { col: 'transactions', idx: 'transactionCode_1' },
    { col: 'payments', idx: 'paymentNumber_1' },
    { col: 'payments', idx: 'paymentCode_1' },
  ];

  console.log('\n=== DROPPING STALE INDEXES ===');
  for (const { col, idx } of toDrop) {
    try {
      await db.collection(col).dropIndex(idx);
      console.log('✅ Dropped:', col, '/', idx);
    } catch(e) {
      if (e.code === 27) {
        console.log('ℹ️  Not found:', col, '/', idx);
      } else {
        console.log('❌ Error:', col, '/', idx, '-', e.message);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone!');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
