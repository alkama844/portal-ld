import { Request, Response } from 'express';
import { CustomFieldDefinition } from '../models/CustomFieldDefinition';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';
import { logger } from '../utils/logger';

const inMemoryCustomFields: any[] = [
  {
    _id: 'cf-1',
    id: 'cf-1',
    name: 'Blood Group',
    key: 'blood_group',
    type: 'select',
    required: false,
    options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    active: true,
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'cf-2',
    id: 'cf-2',
    name: 'Occupation',
    key: 'occupation',
    type: 'text',
    required: false,
    active: true,
    order: 2,
    createdAt: new Date().toISOString()
  },
  {
    _id: 'cf-3',
    id: 'cf-3',
    name: 'Guardian Name',
    key: 'guardian_name',
    type: 'text',
    required: false,
    active: true,
    order: 3,
    createdAt: new Date().toISOString()
  }
];

function extractDocs(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result.map((item) => item.data || item);
  if (Array.isArray(result.data)) return result.data.map((item: any) => item.data || item);
  if (Array.isArray(result.documents)) return result.documents.map((item: any) => item.data || item);
  if (Array.isArray(result.items)) return result.items.map((item: any) => item.data || item);
  return [];
}

export const listCustomFields = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const fields = await CustomFieldDefinition.find().sort({ order: 1, createdAt: 1 }).lean();
      return res.status(200).json({ success: true, data: fields });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const result = await nafijDb.collection<any>('custom_fields').find({ limit: 50 });
        const list = extractDocs(result);
        if (list.length > 0) {
          return res.status(200).json({ success: true, data: list });
        }
      } catch (err) {
        logger.warn('NafijDB listCustomFields failed, using memory', { err });
      }
    }

    return res.status(200).json({ success: true, data: inMemoryCustomFields });
  } catch (error: any) {
    logger.error('Error fetching custom fields', { error });
    return res.status(500).json({ success: false, message: 'Failed to retrieve custom fields' });
  }
};

export const createCustomField = async (req: Request, res: Response) => {
  try {
    const { name, key, type, required, options, active, order } = req.body;

    if (!name || !key || !type) {
      return res.status(400).json({
        success: false,
        message: 'Field name, unique key, and field type are required.'
      });
    }

    const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const fieldData = {
      name: name.trim(),
      key: normalizedKey,
      type,
      required: Boolean(required),
      options: Array.isArray(options) ? options : [],
      active: active !== undefined ? Boolean(active) : true,
      order: Number(order) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const field = new CustomFieldDefinition(fieldData);
      await field.save();
      return res.status(201).json({ success: true, message: 'Custom field created successfully', data: field });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        const created = await nafijDb.collection<any>('custom_fields').insert(fieldData);
        const doc = (created as any)?.data || created;
        const newField = { ...fieldData, id: doc.id || doc._id || `cf-${Date.now()}`, _id: doc.id || doc._id || `cf-${Date.now()}` };
        inMemoryCustomFields.push(newField);
        return res.status(201).json({ success: true, message: 'Custom field created successfully', data: newField });
      } catch (err) {
        logger.warn('NafijDB custom field insert failed', { err });
      }
    }

    const localField = { ...fieldData, id: `cf-${Date.now()}`, _id: `cf-${Date.now()}` };
    inMemoryCustomFields.push(localField);
    return res.status(201).json({ success: true, message: 'Custom field created successfully', data: localField });
  } catch (error: any) {
    logger.error('Error creating custom field', { error });
    return res.status(500).json({ success: false, message: error.message || 'Failed to create custom field' });
  }
};

export const updateCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      const field = await CustomFieldDefinition.findByIdAndUpdate(id, updates, { new: true });
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      return res.status(200).json({ success: true, data: field });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection('custom_fields').update(id, updates);
      } catch (err) {
        logger.warn('NafijDB update custom field failed', { err });
      }
    }

    const found = inMemoryCustomFields.find((f) => f.id === id || f._id === id);
    if (found) {
      Object.assign(found, updates, { updatedAt: new Date().toISOString() });
      return res.status(200).json({ success: true, data: found });
    }

    return res.status(404).json({ success: false, message: 'Field not found' });
  } catch (error: any) {
    logger.error('Error updating custom field', { error });
    return res.status(500).json({ success: false, message: 'Failed to update custom field' });
  }
};

export const deleteCustomField = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const isDbConnected = getDatabaseStatus() === 'connected';
    if (isDbConnected) {
      await CustomFieldDefinition.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: 'Field deleted' });
    }

    const nafijDb = getNafijDB();
    if (nafijDb) {
      try {
        await nafijDb.collection('custom_fields').delete(id);
      } catch (err) {
        logger.warn('NafijDB delete custom field failed', { err });
      }
    }

    const idx = inMemoryCustomFields.findIndex((f) => f.id === id || f._id === id);
    if (idx !== -1) inMemoryCustomFields.splice(idx, 1);

    return res.status(200).json({ success: true, message: 'Field deleted' });
  } catch (error: any) {
    logger.error('Error deleting custom field', { error });
    return res.status(500).json({ success: false, message: 'Failed to delete custom field' });
  }
};
