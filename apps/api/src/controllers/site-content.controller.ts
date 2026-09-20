import { Request, Response } from 'express';
import { SiteContent } from '../models/SiteContent';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDatabaseStatus } from '../config/database';
import { logger } from '../utils/logger';

// Default authentic content for Lucky Dental Care
export const DEFAULT_SITE_CONTENT: Record<string, { page: string; section: string; value: string; type: 'text' | 'multiline' | 'image' | 'link'; label: string }> = {
  // Global / Contact
  'global.clinic_name': { page: 'global', section: 'brand', value: 'Lucky Dental Care', type: 'text', label: 'ক্লিনিকের নাম' },
  'global.tagline': { page: 'global', section: 'brand', value: 'Smile for Life • Estd 1982', type: 'text', label: 'ট্যাগলাইন' },
  'global.phone': { page: 'global', section: 'contact', value: '০১৭১৫-৯১৭৮৩৪', type: 'text', label: 'ফোন নম্বর' },
  'global.phone_raw': { page: 'global', section: 'contact', value: '01715917834', type: 'text', label: 'কল ডায়াল লিঙ্ক' },
  'global.address': { page: 'global', section: 'contact', value: 'কুষ্টিয়া, বাংলাদেশ', type: 'text', label: 'ঠিকানা' },
  'global.doctor_name': { page: 'global', section: 'brand', value: 'ডেন্টিস্ট মোঃ যোসেফ বিশ্বাস (রকি)', type: 'text', label: 'প্রধান ডেন্টিস্ট' },
  'global.facebook_url': { page: 'global', section: 'social', value: 'https://www.facebook.com/luckydentalcare1982/', type: 'link', label: 'ফেসবুক লিঙ্ক' },
  'global.maps_url': { page: 'global', section: 'contact', value: 'https://www.google.com/maps/place/Lucky+Dental+Care/@23.9080413,89.13006,978m/data=!3m1!1e3!4m6!3m5!1s0x39fe97007520661f:0xbec8cc848fb24d5d!8m2!3d23.9080413!4d89.13006!16s%2Fg%2F11wy1mrwj2?entry=ttu', type: 'link', label: 'গুগল ম্যাপ লিঙ্ক' },

  // Home Hero
  'home.hero.badge': { page: 'home', section: 'hero', value: '১৯৮২ সাল থেকে • ৪৪ বছরের গৌরবময় অভিজ্ঞতা', type: 'text', label: 'হিরো ব্যাজ' },
  'home.hero.title': { page: 'home', section: 'hero', value: 'চার দশকের ঐতিহ্যে আপনার সুন্দর হাসির বিশ্বস্ত ঠিকানা', type: 'text', label: 'হিরো শিরোনাম' },
  'home.hero.subtitle': { page: 'home', section: 'hero', value: 'অভিজ্ঞতা, আধুনিক প্রযুক্তি ও আন্তরিক যত্নের সমন্বয়ে Lucky Dental Care ১৯৮২ সাল থেকে কুষ্টিয়াবাসীর হাসির আস্থার প্রতীক হয়ে নিরবচ্ছিন্ন ডেন্টাল সেবা প্রদান করে আসছে।', type: 'multiline', label: 'হিরো সাবটাইটেল' },
  'home.hero.image': { page: 'home', section: 'hero', value: 'lucky_image/image_front.jpg', type: 'image', label: 'হিরো মূল ছবি' },

  // Home CTA Banner
  'home.cta.badge': { page: 'home', section: 'cta', value: 'দ্রুত শিডিউল করুন', type: 'text', label: 'সিটিআই ব্যাজ' },
  'home.cta.title': { page: 'home', section: 'cta', value: 'দাঁতের যে কোনো সমস্যায় আর অপেক্ষা নয়', type: 'text', label: 'সিটিআই শিরোনাম' },
  'home.cta.subtitle': { page: 'home', section: 'cta', value: 'অভিজ্ঞ ডেন্টিস্ট দ্বারা সঠিক রোগ নির্ণয় ও সর্বোচ্চ আন্তর্জাতিক মানসম্মত নিরাপদ চিকিৎসাসেবা গ্রহণ করুন।', type: 'multiline', label: 'সিটিআই সাবটাইটেল' },

  // Home Estimator Section
  'home.estimator.badge': { page: 'home', section: 'estimator', value: 'খরচের স্বচ্ছতা ও পূর্বপরিকল্পনা', type: 'text', label: 'এস্টিমেটর ব্যাজ' },
  'home.estimator.title': { page: 'home', section: 'estimator', value: 'কুষ্টিয়ায় দাঁতের চিকিৎসায় কত খরচ হতে পারে?', type: 'text', label: 'এস্টিমেটর শিরোনাম' },
  'home.estimator.subtitle': { page: 'home', section: 'estimator', value: 'আপনার প্রয়োজনীয় সেবাগুলো নির্বাচন করে একটি আনুমানিক খরচ দেখুন।', type: 'multiline', label: 'এস্টিমেটর সাবটাইটেল' },
  'home.estimator.disclaimer': { page: 'home', section: 'estimator', value: 'এটি শুধুমাত্র প্রাথমিক আনুমানিক হিসাব। রোগীর অবস্থা, চিকিৎসা পরিকল্পনা ও প্রয়োজনীয় উপকরণের ভিত্তিতে প্রকৃত খরচ পরিবর্তিত হতে পারে।', type: 'multiline', label: 'এস্টিমেটর সতর্কবার্তা' },

  // About Page
  'about.story.title': { page: 'about', section: 'story', value: '১৯৮২ সাল থেকে চার দশকের নিরবচ্ছিন্ন সেবা', type: 'text', label: 'আমাদের গল্প শিরোনাম' },
  'about.story.content': { page: 'about', section: 'story', value: 'কুষ্টিয়া শহরের প্রাণকেন্দ্রে প্রতিষ্ঠিত Lucky Dental Care আধুনিক ডেন্টাল চিকিৎসার পথিকৃৎ। চার দশকের অভিজ্ঞতায় হাজারো রোগীর মুখে হাসি ফিরিয়ে দেওয়াই আমাদের সাফল্য।', type: 'multiline', label: 'আমাদের গল্প বিস্তারিত' }
};

// In-memory cache for fast public reads and offline fallback
let memoryContentCache: Record<string, any> = {};

export const seedDefaultSiteContent = async () => {
  try {
    if (getDatabaseStatus() !== 'connected') return;

    const count = await SiteContent.countDocuments();
    if (count === 0) {
      const items = Object.entries(DEFAULT_SITE_CONTENT).map(([key, data]) => ({
        key,
        page: data.page,
        section: data.section,
        value: data.value,
        type: data.type,
        label: data.label,
        updatedBy: 'system-seed'
      }));
      await SiteContent.insertMany(items);
      logger.info(`Seeded ${items.length} initial site content items for Lucky Dental Care`);
    }
  } catch (err) {
    logger.warn('Initial site content seeding deferred', { err });
  }
};

/**
 * Public Endpoint: GET /api/site-content
 * Returns key-value pairs of all public website content
 */
export const getPublicSiteContent = async (req: Request, res: Response) => {
  try {
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const docs = await SiteContent.find().lean();
      const contentMap: Record<string, any> = {};

      // Seed defaults into response if db is empty
      if (docs.length === 0) {
        Object.entries(DEFAULT_SITE_CONTENT).forEach(([k, v]) => {
          contentMap[k] = v.value;
        });
        // Asynchronously seed in background
        seedDefaultSiteContent().catch(() => {});
      } else {
        docs.forEach((doc) => {
          contentMap[doc.key] = doc.value;
        });
      }

      memoryContentCache = contentMap;

      return res.status(200).json({
        success: true,
        version: Date.now(),
        content: contentMap
      });
    }

    // Offline database fallback mode
    const fallbackMap: Record<string, any> = {};
    Object.entries(DEFAULT_SITE_CONTENT).forEach(([k, v]) => {
      fallbackMap[k] = memoryContentCache[k] || v.value;
    });

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      content: fallbackMap
    });
  } catch (error: any) {
    logger.error('Failed to get public site content', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to retrieve site content' });
  }
};

/**
 * Public Endpoint: GET /api/site-content/:page
 */
export const getPublicSiteContentByPage = async (req: Request, res: Response) => {
  try {
    const { page } = req.params;
    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const docs = await SiteContent.find({
        $or: [{ page }, { page: 'global' }]
      }).lean();

      const contentMap: Record<string, any> = {};
      docs.forEach((doc) => {
        contentMap[doc.key] = doc.value;
      });

      return res.status(200).json({ success: true, page, content: contentMap });
    }

    // Offline fallback
    const fallbackMap: Record<string, any> = {};
    Object.entries(DEFAULT_SITE_CONTENT)
      .filter(([_, v]) => v.page === page || v.page === 'global')
      .forEach(([k, v]) => {
        fallbackMap[k] = memoryContentCache[k] || v.value;
      });

    return res.status(200).json({ success: true, page, content: fallbackMap });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve page content' });
  }
};

/**
 * Admin Endpoint: PUT /api/admin/site-content
 * Updates or creates a single content key
 */
export const updateSiteContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value, type, page, section, label } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // Sanitize string
    const cleanKey = String(key).trim();
    const cleanVal = String(value).trim();

    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const updated = await SiteContent.findOneAndUpdate(
        { key: cleanKey },
        {
          $set: {
            value: cleanVal,
            updatedBy: req.user?.email || 'admin',
            ...(type && { type }),
            ...(page && { page }),
            ...(section && { section }),
            ...(label && { label })
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      memoryContentCache[cleanKey] = cleanVal;
      logger.info(`Site content updated: ${cleanKey} by ${req.user?.email}`);

      return res.status(200).json({
        success: true,
        message: 'Content updated successfully',
        item: updated
      });
    }

    // Update in memory if DB offline
    memoryContentCache[cleanKey] = cleanVal;
    return res.status(200).json({
      success: true,
      mode: 'fallback',
      message: 'Content updated in memory session',
      key: cleanKey,
      value: cleanVal
    });
  } catch (error: any) {
    logger.error('Update site content failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to update site content' });
  }
};

/**
 * Admin Endpoint: POST /api/admin/site-content/batch
 * Updates multiple key-value pairs at once
 */
export const batchUpdateSiteContent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || typeof items !== 'object') {
      return res.status(400).json({ error: 'Items payload must be an object of key-values or array' });
    }

    const updates: { key: string; value: string }[] = Array.isArray(items)
      ? items
      : Object.entries(items).map(([key, value]) => ({ key, value: String(value) }));

    const isDbConnected = getDatabaseStatus() === 'connected';

    if (isDbConnected) {
      const bulkOps = updates.map((item) => ({
        updateOne: {
          filter: { key: item.key.trim() },
          update: {
            $set: {
              value: String(item.value).trim(),
              updatedBy: req.user?.email || 'admin'
            }
          },
          upsert: true
        }
      }));

      await SiteContent.bulkWrite(bulkOps);
      updates.forEach((u) => {
        memoryContentCache[u.key.trim()] = String(u.value).trim();
      });

      logger.info(`Batch updated ${updates.length} site content items by ${req.user?.email}`);
      return res.status(200).json({
        success: true,
        message: `Successfully updated ${updates.length} content items`,
        updatedCount: updates.length
      });
    }

    // In-memory fallback
    updates.forEach((u) => {
      memoryContentCache[u.key.trim()] = String(u.value).trim();
    });

    return res.status(200).json({
      success: true,
      mode: 'fallback',
      message: `Updated ${updates.length} items in memory session`,
      updatedCount: updates.length
    });
  } catch (error: any) {
    logger.error('Batch update failed', { error: error?.message || error });
    return res.status(500).json({ error: 'Failed to batch update content' });
  }
};
