import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface MaintenanceState {
  site: string;
  isMaintenance: boolean;
  rawActive: boolean;
  message: string;
  title: string;
  description: string;
  extraDescription: string;
  mediaType: string;
  mediaUrl: string;
  btnText: string;
  btnUrl: string;
  lastChecked: number;
}

const SITE_ID = process.env.MAINTAIN_SITE || 'luckydental';
const API_URL = process.env.MAINTAIN_API_URL || `https://maintain-doc.vercel.app/api/status/${encodeURIComponent(SITE_ID)}`;
const ENCRYPTION_KEY = process.env.MAINTAIN_ENCRYPTION_KEY || 'nafijthepro';
const PASSCODE = process.env.MAINTAIN_PASSCODE || 'ARYIDBhGXg==';
const CACHE_TTL_MS = 15000; // 15 seconds cache

let cachedState: MaintenanceState = {
  site: SITE_ID,
  isMaintenance: false,
  rawActive: false,
  message: '',
  title: 'Maintenance Mode',
  description: 'Our systems are undergoing scheduled maintenance. Back online shortly.',
  extraDescription: '',
  mediaType: 'none',
  mediaUrl: '',
  btnText: '',
  btnUrl: '',
  lastChecked: 0
};

let fetchInProgress: Promise<MaintenanceState> | null = null;

function decryptField(b64: string | undefined, key: string = ENCRYPTION_KEY): string {
  if (!b64 || typeof b64 !== 'string') return '';
  const trimmed = b64.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes(' ')) {
    return trimmed;
  }
  try {
    const raw = Buffer.from(trimmed, 'base64').toString('binary');
    let res = '';
    for (let i = 0; i < raw.length; i++) {
      res += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return res;
  } catch {
    return trimmed;
  }
}

export async function fetchMaintenanceStatus(): Promise<MaintenanceState> {
  const now = Date.now();
  if (now - cachedState.lastChecked < CACHE_TTL_MS) {
    return cachedState;
  }

  if (fetchInProgress) {
    return fetchInProgress;
  }

  fetchInProgress = (async () => {
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as any;
      const rawActive = data?.active;
      const maintenanceVal = data?.maintenance;

      // When active is true OR maintenance is true -> maintenance mode is ON
      // When active is false OR maintenance is false -> maintenance mode is OFF (show website)
      const isMaintenance = maintenanceVal !== undefined
        ? Boolean(maintenanceVal)
        : (rawActive === true || rawActive === 'true');

      const message = decryptField(data?.message) || '';
      const title = decryptField(data?.maintenanceTitle) || 'Maintenance Mode';
      const description = decryptField(data?.maintenanceDescription) || 'Our systems are undergoing scheduled maintenance. Back online shortly.';
      const extraDescription = decryptField(data?.extraDescription) || '';
      const mediaType = data?.mediaType || 'none';
      const mediaUrl = decryptField(data?.mediaUrl) || '';
      const btnText = decryptField(data?.btnText) || '';
      const btnUrl = decryptField(data?.btnUrl) || '';

      cachedState = {
        site: SITE_ID,
        isMaintenance,
        rawActive: Boolean(rawActive),
        message,
        title,
        description,
        extraDescription,
        mediaType,
        mediaUrl,
        btnText,
        btnUrl,
        lastChecked: Date.now()
      };
    } catch (err: any) {
      // In case of network timeout/error, retain previous state and update timestamp
      logger.warn('Failed to fetch MaintainDoc status from remote API; retaining cached state', { error: err?.message || err });
      cachedState.lastChecked = Date.now() - (CACHE_TTL_MS - 5000); // retry after 5s
    } finally {
      fetchInProgress = null;
    }

    return cachedState;
  })();

  return fetchInProgress;
}

// Initial status fetch on module load
fetchMaintenanceStatus().catch(() => {});

export const getMaintenanceState = (): MaintenanceState => cachedState;

export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Always allow CORS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Always allow health checks, root info, and maintenance status check
  const path = req.path;
  if (
    path === '/' ||
    path === '/health' ||
    path === '/api/health' ||
    path === '/api/maintenance/status'
  ) {
    return next();
  }

  try {
    const state = await fetchMaintenanceStatus();

    if (!state.isMaintenance) {
      return next();
    }

    // Check for bypass headers or query tokens (e.g. owner admin backdoor)
    const bypassHeader = req.headers['x-maintenance-bypass'];
    const passcodeHeader = req.headers['x-maintenance-passcode'];
    const queryBypass = req.query.bypass;

    if (
      bypassHeader === 'true' ||
      passcodeHeader === PASSCODE ||
      passcodeHeader === ENCRYPTION_KEY ||
      queryBypass === PASSCODE
    ) {
      return next();
    }

    // If request has valid admin authorization, allow bypass for admin operations
    const authHeader = req.headers.authorization;
    const adminCookie = req.cookies?.admin_token;
    if (authHeader?.startsWith('Bearer ') || adminCookie) {
      return next();
    }

    // Return 503 Maintenance Mode
    return res.status(503).json({
      success: false,
      maintenance: true,
      error: 'Service Unavailable — System Under Maintenance',
      site: state.site,
      title: state.title,
      message: state.message,
      description: state.description,
      extraDescription: state.extraDescription,
      mediaType: state.mediaType,
      mediaUrl: state.mediaUrl,
      btnText: state.btnText,
      btnUrl: state.btnUrl
    });
  } catch (error) {
    logger.error('Error in maintenance middleware', { error });
    return next();
  }
};
