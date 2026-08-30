import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luckydental';

async function auditDataIntegrity() {
  console.log('====================================================');
  console.log(' LUCKYDENTAL — DATABASE INTEGRITY AUDIT');
  console.log('====================================================');
  console.log(`Connecting to: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully.\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database handle is undefined');
    }

    const patientsColl = db.collection('patients');
    const receiptsColl = db.collection('receipts');
    const appointmentsColl = db.collection('appointments');
    const countersColl = db.collection('counters');

    const [patientCount, receiptCount, currentReceiptCount, appointmentCount] = await Promise.all([
      patientsColl.countDocuments({}),
      receiptsColl.countDocuments({}),
      receiptsColl.countDocuments({ isCurrent: true }),
      appointmentsColl.countDocuments({})
    ]);

    console.log(`Active Patients: ${patientCount}`);
    console.log(`Total Receipts: ${receiptCount} (Current: ${currentReceiptCount}, Historical Snapshots: ${receiptCount - currentReceiptCount})`);
    console.log(`Total Appointments: ${appointmentCount}`);

    // Get all valid active patient numbers
    const activePatients = await patientsColl.find({}, { projection: { patientNumber: 1, fullName: 1 } }).toArray();
    const activePatientNums = new Set(activePatients.map((p) => Number(p.patientNumber)));

    // Check for orphan receipts
    const allReceipts = await receiptsColl.find({}).toArray();
    const orphanReceipts = allReceipts.filter((r) => !activePatientNums.has(Number(r.patientNumber)));

    // Check for orphan appointments
    const allAppointments = await appointmentsColl.find({}).toArray();
    const orphanAppointments = allAppointments.filter((a) => !activePatientNums.has(Number(a.patientNumber)));

    console.log('\n--- INTEGRITY CHECKS ---');
    console.log(`Orphaned Receipts (no matching patient): ${orphanReceipts.length}`);
    if (orphanReceipts.length > 0) {
      orphanReceipts.forEach((r) => {
        console.log(`  - Receipt #${r.receiptNumber} for missing Patient #${r.patientNumber}`);
      });
    }

    console.log(`Orphaned Appointments (no matching patient): ${orphanAppointments.length}`);
    if (orphanAppointments.length > 0) {
      orphanAppointments.forEach((a) => {
        console.log(`  - Appointment for missing Patient #${a.patientNumber} on ${a.appointmentDate}`);
      });
    }

    const isFixMode = process.argv.includes('--fix');
    if (isFixMode && (orphanReceipts.length > 0 || orphanAppointments.length > 0)) {
      console.log('\n[FIX MODE] Cleaning up orphaned records...');
      if (orphanReceipts.length > 0) {
        const orphanReceiptIds = orphanReceipts.map((r) => r._id);
        const resR = await receiptsColl.deleteMany({ _id: { $in: orphanReceiptIds } });
        console.log(`Deleted ${resR.deletedCount} orphaned receipts.`);
      }
      if (orphanAppointments.length > 0) {
        const orphanAptIds = orphanAppointments.map((a) => a._id);
        const resA = await appointmentsColl.deleteMany({ _id: { $in: orphanAptIds } });
        console.log(`Deleted ${resA.deletedCount} orphaned appointments.`);
      }
    } else if (orphanReceipts.length > 0 || orphanAppointments.length > 0) {
      console.log('\n[NOTICE] To clean up orphaned records safely, run: npm run audit:db -- --fix');
    } else {
      console.log('\n[RESULT] Perfect Data Integrity! Zero orphaned receipts or appointments detected.');
    }

    console.log('====================================================\n');
  } catch (error) {
    console.error('Database integrity audit failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

auditDataIntegrity();
