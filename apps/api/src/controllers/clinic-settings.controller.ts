import { Request, Response } from 'express';
import { clinicSettingsService } from '../services/clinic-settings.service';
import { logger } from '../utils/logger';

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const settings = await clinicSettingsService.getSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error: any) {
    logger.error('Error getting clinic settings', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve clinic settings' });
  }
};

export const updateClinicSettings = async (req: Request, res: Response) => {
  try {
    const { clinicName, tagline, phone, email, address, website, receiptFooter, logoUrl, frontendColor } = req.body;

    // If only frontendColor is being updated via this endpoint
    if (frontendColor && !clinicName && !phone && !address) {
      const updated = await clinicSettingsService.updateSettings({ frontendColor });
      return res.status(200).json({
        success: true,
        message: 'Theme color updated successfully',
        data: updated
      });
    }

    if (!clinicName || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name, contact phone, and address are required.'
      });
    }

    const updated = await clinicSettingsService.updateSettings({
      clinicName,
      tagline,
      phone,
      email,
      address,
      website,
      receiptFooter,
      logoUrl,
      frontendColor
    });

    return res.status(200).json({
      success: true,
      message: 'Clinic identity and receipt settings updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating clinic settings', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update clinic settings'
    });
  }
};

export const updateThemeColor = async (req: Request, res: Response) => {
  try {
    const { frontendColor, themeColor, color } = req.body;
    const selectedColor = frontendColor || themeColor || color;

    if (!selectedColor || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(selectedColor.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid hex color code (e.g. #941324) is required.'
      });
    }

    const updated = await clinicSettingsService.updateSettings({
      frontendColor: selectedColor.trim()
    });

    return res.status(200).json({
      success: true,
      message: 'Frontend theme color updated successfully',
      data: updated
    });
  } catch (error: any) {
    logger.error('Error updating theme color', { error });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update theme color'
    });
  }
};

