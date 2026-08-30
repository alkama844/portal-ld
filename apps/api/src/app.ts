import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';
import packageRoutes from './routes/package.routes';
import receiptRoutes from './routes/receipt.routes';
import appointmentRoutes from './routes/appointment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import customFieldRoutes from './routes/custom-field.routes';
import publicRoutes from './routes/public.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Direct Health Route (e.g. http://localhost:5000/health)
app.use('/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Luckydental Management API',
    health: '/health',
    apiHealth: '/api/health'
  });
});

// Mount Public API routes (no auth needed)
app.use('/api', publicRoutes);

// Mount Admin API routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', patientRoutes);
app.use('/api', packageRoutes);
app.use('/api', receiptRoutes);
app.use('/api', appointmentRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', customFieldRoutes);

// Error Handler
app.use(errorHandler);

export default app;
