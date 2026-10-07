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
    const { clinicName, tagline, phone, email, address, website, receiptFooter, logoUrl, frontendColor, frontendHoverColor, hoverColor } = req.body;
    const finalHover = frontendHoverColor || hoverColor;

    // If only colors are being updated via this endpoint
    if ((frontendColor || finalHover) && !clinicName && !phone && !address) {
      const payload: any = {};
      if (frontendColor) payload.frontendColor = frontendColor;
      if (finalHover) payload.frontendHoverColor = finalHover;
      const updated = await clinicSettingsService.updateSettings(payload);
      return res.status(200).json({
        success: true,
        message: 'Theme colors updated successfully',
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
      frontendColor,
      frontendHoverColor: finalHover
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
    const { frontendColor, themeColor, color, frontendHoverColor, hoverColor } = req.body;
    const selectedColor = frontendColor || themeColor || color;
    const selectedHover = frontendHoverColor || hoverColor;

    if (!selectedColor && !selectedHover) {
      return res.status(400).json({
        success: false,
        message: 'A valid hex color code (e.g. #941324) is required.'
      });
    }

    const payload: any = {};
    if (selectedColor) {
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(selectedColor.trim())) {
        return res.status(400).json({
          success: false,
          message: 'A valid theme hex color code (e.g. #941324) is required.'
        });
      }
      payload.frontendColor = selectedColor.trim();
    }

    if (selectedHover) {
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(selectedHover.trim())) {
        return res.status(400).json({
          success: false,
          message: 'A valid hover hex color code (e.g. #770f1d) is required.'
        });
      }
      payload.frontendHoverColor = selectedHover.trim();
    }

    const updated = await clinicSettingsService.updateSettings(payload);

    return res.status(200).json({
      success: true,
      message: 'Frontend theme and hover colors updated successfully',
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

