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

const app = express();

app.use(cors());
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
