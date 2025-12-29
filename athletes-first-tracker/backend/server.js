const express = require('express');
const cors = require('cors');
const db = require('./database/db');

const playersRoutes = require('./routes/players');
const materialsRoutes = require('./routes/materials');
const agentsRoutes = require('./routes/agents');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/agents', agentsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Athletes First Recruiting Tracker API',
    version: '1.0.0',
    endpoints: {
      players: '/api/players',
      materials: '/api/materials',
      agents: '/api/agents'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║   Athletes First Recruiting Tracker API              ║
║   Server running on http://localhost:${PORT}          ║
╚═══════════════════════════════════════════════════════╝
      `);
      console.log('Available endpoints:');
      console.log(`  - GET    /api/players`);
      console.log(`  - GET    /api/players/:id`);
      console.log(`  - POST   /api/players`);
      console.log(`  - PUT    /api/players/:id`);
      console.log(`  - DELETE /api/players/:id`);
      console.log(`  - GET    /api/players/analytics`);
      console.log(`  - POST   /api/materials`);
      console.log(`  - GET    /api/materials/types`);
      console.log(`  - GET    /api/agents`);
      console.log(`  - GET    /api/agents/performance`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await db.close();
  process.exit(0);
});

startServer();

module.exports = app;
