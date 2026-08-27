import { connectDB } from '../server/config/db.js';
import AuditLog from '../server/models/AuditLog.js';

async function testImmutability() {
  await connectDB();
  const doc = await AuditLog.findOne().lean();
  console.log('Target AuditLog ID:', doc._id.toString());

  try {
    await AuditLog.updateOne({ _id: doc._id }, { actor: 'unauthorized_edit' });
    console.log('Update succeeded unexpectedly');
  } catch (err) {
    console.log('RAW updateOne rejection error:\n' + err.message);
  }

  try {
    await AuditLog.deleteOne({ _id: doc._id });
    console.log('Delete succeeded unexpectedly');
  } catch (err) {
    console.log('RAW deleteOne rejection error:\n' + err.message);
  }

  process.exit(0);
}

testImmutability();
