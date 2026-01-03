require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./database/db');

const playersRoutes = require('./routes/players');
const materialsRoutes = require('./routes/materials');
const agentsRoutes = require('./routes/agents');
const authRoutes = require('./routes/auth');
const schoolsRoutes = require('./routes/schools');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS Configuration - Update RAILWAY_FRONTEND_URL with your Railway frontend domain
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'http://localhost:3001', // Local development
  process.env.RAILWAY_FRONTEND_URL || '', // Railway frontend (set in env vars)
].filter(Boolean); // Remove empty strings

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
app.use('/api/schools', schoolsRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Version check endpoint
app.get('/api/version', async (req, res) => {
  try {
    // Check if new tables/columns exist
    const hasTransfersTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='player_transfers'");
    const playerColumns = await db.query("PRAGMA table_info(players)");
    const hasRecruitingFields = playerColumns.some(col => col.name === 'recruiting_stars');

    res.json({
      version: '2.0.0',
      deployedAt: new Date().toISOString(),
      features: {
        transferPortalAPI: true,
        recruitingData: hasRecruitingFields,
        transferHistory: !!hasTransfersTable,
        schoolAutocomplete: true,
        schoolNormalization: true
      },
      endpoints: {
        '/api/players/transfer-data': 'CFBD Transfer Portal API',
        '/api/players/:id/transfers': 'Get player transfer history',
        '/api/players/recruiting-data': 'CFBD Recruiting data',
        '/api/schools/lookup': 'School normalization',
        '/api/schools/search': 'School autocomplete'
      }
    });
  } catch (error) {
    res.json({
      version: '2.0.0',
      error: 'Could not verify database features',
      message: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Athletes First Recruiting Tracker API',
    version: '2.0.0',
    endpoints: {
      players: '/api/players',
      materials: '/api/materials',
      agents: '/api/agents',
      schools: '/api/schools',
      version: '/api/version'
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

    // Run database migrations
    await runMigrations();

    // Auto-create default admin user if it doesn't exist
    await createDefaultAdminIfNeeded();

    // Auto-import schools data if table is empty
    await importSchoolsIfNeeded();

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

// Run database migrations
async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Run recruiting and transfers migration
    try {
      const migrate = require('./database/migrations/add_recruiting_and_transfers');
      await migrate();
    } catch (error) {
      console.error('⚠️  Recruiting migration error:', error.message);
    }

    // Run material events migration
    try {
      const { runMigrations: runMaterialEventsMigrations } = require('./database/runMigrations');
      await runMaterialEventsMigrations();
    } catch (error) {
      console.error('⚠️  Material events migration error:', error.message);
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('⚠️  Migration error:', error.message);
    // Don't fail startup if migration fails
  }
}

// Create default admin user if it doesn't exist
async function createDefaultAdminIfNeeded() {
  try {
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (existingAdmin) {
      console.log('✓ Admin user already exists');
      return;
    }

    // Create admin user
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);

    await db.run(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, ['admin', 'admin@athletesfirst.com', hash, 'admin']);

    console.log('✓ Default admin user created!');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  ⚠️  IMPORTANT: Change this password after first login!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Auto-import schools data if needed
async function importSchoolsIfNeeded() {
  try {
    const count = await db.get('SELECT COUNT(*) as count FROM schools');

    if (count.count > 0) {
      console.log(`✓ Schools table already populated (${count.count} schools)`);
      return;
    }

    console.log('📚 Schools table is empty, importing data...');
    const importSchools = require('./database/import-schools');
    await importSchools(true); // skipInit=true since db is already initialized
    console.log('✅ Schools import complete!');
  } catch (error) {
    console.error('⚠️  Error importing schools:', error.message);
    console.error('   Schools functionality may be limited');
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
