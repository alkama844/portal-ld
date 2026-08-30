import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';
import { getNafijDB } from '../config/nafijdb';

export const getHealthStatus = (req: Request, res: Response) => {
  const nafijDbActive = Boolean(process.env.NAFIJ_DB_KEY);
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    status: 'ok',
    database: {
      mongodb: dbStatus,
      nafijdb: nafijDbActive ? 'connected' : 'inactive',
      activeProvider: dbStatus === 'connected' ? 'MongoDB' : (nafijDbActive ? 'NafijRahaman DB (Cloud)' : 'Local In-Memory')
    },
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`
  });
};
