import { Request, Response } from 'express';
import { Patient } from '../models/Patient';
import { Receipt as MongoReceipt } from '../models/Receipt';
import { Appointment as MongoAppointment } from '../models/Appointment';
import { getDatabaseStatus } from '../config/database';
import { patientService } from '../services/patient.service';
import { receiptService } from '../services/receipt.service';
import { appointmentService } from '../services/appointment.service';
import { logger } from '../utils/logger';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';
    const todayStr = new Date().toISOString().split('T')[0];

    if (isDbConnected) {
      // 1. Fetch active patients and count directly from MongoDB
      const [totalPatients, activePatients] = await Promise.all([
        Patient.countDocuments({}),
        Patient.find({}, { 
          patientNumber: 1, 
          _id: 1, 
          fullName: 1, 
          phone: 1, 
          age: 1, 
          patientProblem: 1, 
          createdAt: 1, 
          profileImage: 1 
        })
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const activePatientNumbers = new Set(activePatients.map((p) => Number(p.patientNumber)));
      const activePatientNumberArray = Array.from(activePatientNumbers);
      const recentPatients = activePatients.slice(0, 5);

      // 2. Fetch current receipts ONLY for active existing patients (prevents historical version double counting and deleted patient leakage)
      const currentReceipts = await MongoReceipt.find({
        isCurrent: true,
        patientNumber: { $in: activePatientNumberArray }
      }).sort({ createdAt: -1 }).lean();

      const totalReceipts = currentReceipts.length;
      let totalRevenue = 0;
      let todayRevenue = 0;
      let pendingDue = 0;

      for (const r of currentReceipts) {
        const paid = Number(r.paidAmount) || 0;
        const due = Number(r.dueAmount) || 0;
        totalRevenue += paid;
        pendingDue += due;

        const createdDate = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '';
        if (createdDate === todayStr) {
          todayRevenue += paid;
        }
      }

      // Map up to 5 recent receipts with patient metadata populated
      const recentReceipts = currentReceipts.slice(0, 5).map((r: any) => {
        const matchingPatient = activePatients.find((p) => Number(p.patientNumber) === Number(r.patientNumber));
        return receiptService['mapMongoToReceipt']({
          ...r,
          patientId: matchingPatient || r.patientId,
          patientName: matchingPatient?.fullName || r.patientName || 'Patient',
          patientPhone: matchingPatient?.phone || r.patientPhone || '',
          patientAge: matchingPatient?.age || r.patientAge,
          patientAddress: (matchingPatient as any)?.address || r.patientAddress
        });
      });

      // 3. Fetch appointments ONLY for active existing patients
      const activeAppointments = await MongoAppointment.find({
        patientNumber: { $in: activePatientNumberArray }
      }).sort({ appointmentDate: 1, appointmentTime: 1 }).lean();

      const todayAppointments = activeAppointments.filter(
        (a) => a.appointmentDate === todayStr && a.status !== 'cancelled'
      ).length;

      const upcomingAppointments = activeAppointments.filter(
        (a) => a.status === 'upcoming'
      ).length;

      const recentAppointments = activeAppointments
        .filter((a) => a.status === 'upcoming' || a.appointmentDate >= todayStr)
        .slice(0, 5)
        .map((a) => ({
          ...a,
          id: a._id.toString(),
          _id: a._id.toString()
        }));

      return res.status(200).json({
        success: true,
        data: {
          totalPatients,
          todayAppointments,
          upcomingAppointments,
          totalReceipts,
          todayRevenue,
          totalRevenue,
          pendingDue,
          recentPatients,
          recentAppointments,
          recentReceipts
        }
      });
    }

    // Fallback if MongoDB is temporarily connecting
    const [patientsResult, receiptsResult, appointmentsResult] = await Promise.all([
      patientService.listPatients({ page: 1, limit: 100 }),
      receiptService.listReceipts({ page: 1, limit: 100 }),
      appointmentService.listAppointments({})
    ]);

    const patients = patientsResult.patients || [];
    const activePatientNums = new Set(patients.map((p: any) => Number(p.patientNumber)));
    const receipts = (receiptsResult.receipts || []).filter((r: any) => activePatientNums.has(Number(r.patientNumber)));
    const appointments = (appointmentsResult.appointments || []).filter((a: any) => activePatientNums.has(Number(a.patientNumber)));

    const totalPatients = patients.length;
    const totalReceipts = receipts.length;
    const todayAppointments = appointments.filter((a) => a.appointmentDate === todayStr && a.status !== 'cancelled').length;
    const upcomingAppointments = appointments.filter((a) => a.status === 'upcoming').length;

    const todayRevenue = receipts
      .filter((r) => r.createdAt && r.createdAt.startsWith(todayStr))
      .reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);

    const totalRevenue = receipts.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
    const pendingDue = receipts.reduce((sum, r) => sum + (Number(r.dueAmount) || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalPatients,
        todayAppointments,
        upcomingAppointments,
        totalReceipts,
        todayRevenue,
        totalRevenue,
        pendingDue,
        recentPatients: patients.slice(0, 5),
        recentAppointments: appointments.slice(0, 5),
        recentReceipts: receipts.slice(0, 5)
      }
    });
  } catch (error: any) {
    logger.error('Error calculating dashboard stats', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate dashboard statistics'
    });
  }
};
