import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 DealFlow360 Server running on http://localhost:${PORT}`);
  console.log(`⚡ API Health check: http://localhost:${PORT}/api/health`);
});
