import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import quotationRoutes from './routes/quotation.routes';
import approvalRoutes from './routes/approval.routes';
import recommendationRoutes from './routes/recommendation.routes';
import fulfillmentRoutes from './routes/fulfillment.routes';
import billingRoutes from './routes/billing.routes';
import portalRoutes from './routes/portal.routes';
import dealHealthRoutes from './routes/dealHealth.routes';
import auditRoutes from './routes/audit.routes';
import adminRoutes from './routes/admin.routes';
import discountPolicyRoutes from './routes/discount-policy.routes';
import quoteRequestRoutes from './routes/quoteRequest.routes';

const app = express();

// ── Security: restrict CORS to known origins ─────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman/cURL) and matching dev origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev mode
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// API Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api', recommendationRoutes);
app.use('/api/fulfillment', fulfillmentRoutes);
app.use('/api', billingRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/deal-health', dealHealthRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/discount-policy', discountPolicyRoutes);
app.use('/api/quote-requests', quoteRequestRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', product: 'DealFlow360 B2B Sales Operations Platform', version: '1.0.0' });
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred.',
    },
  });
});

export default app;
