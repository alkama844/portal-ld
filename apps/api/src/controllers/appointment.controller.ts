import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service';
import { logger } from '../utils/logger';

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const { patientNumber, appointmentDate, appointmentTime, category, notes } = req.body;

    if (!patientNumber || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        message: 'Patient number, appointment date, and appointment time are required.'
      });
    }

    const appointment = await appointmentService.createAppointment({
      patientNumber: Number(patientNumber),
      appointmentDate,
      appointmentTime,
      category,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment
    });
  } catch (error: any) {
    logger.error('Error creating appointment', { error });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to schedule appointment'
    });
  }
};

export const listAppointments = async (req: Request, res: Response) => {
  try {
    const { date, category, status, patientIdentifier } = req.query;
    const result = await appointmentService.listAppointments({
      date: date as string,
      category: category as string,
      status: status as string,
      patientIdentifier: patientIdentifier as string
    });

    return res.status(200).json({
      success: true,
      data: result.appointments,
      total: result.total
    });
  } catch (error: any) {
    logger.error('Error listing appointments', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve appointments'
    });
  }
};

export const getPatientAppointments = async (req: Request, res: Response) => {
  try {
    const { patientIdentifier } = req.params;
    const appointments = await appointmentService.getPatientAppointments(patientIdentifier);

    return res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error: any) {
    logger.error('Error retrieving patient appointments', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient appointments'
    });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, category, status, notes } = req.body;

    const updated = await appointmentService.updateAppointment(id, {
      appointmentDate,
      appointmentTime,
      category,
      status,
      notes
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating appointment', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required.'
      });
    }

    const updated = await appointmentService.updateAppointmentStatus(id, status, notes);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating appointment status', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to update appointment'
    });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await appointmentService.deleteAppointment(id);

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled/deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting appointment', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete appointment'
    });
  }
};
