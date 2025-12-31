const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    // Check if event_id column already exists in player_materials
    const columns = await db.query("PRAGMA table_info(player_materials)");
    const hasEventId = columns.some(col => col.name === 'event_id');

    if (!hasEventId) {
      console.log('📦 Running migration: Add event_id to player_materials...');

      // Add event_id column to player_materials
      await db.run(`
        ALTER TABLE player_materials
        ADD COLUMN event_id INTEGER REFERENCES material_events(id) ON DELETE CASCADE
      `);

      console.log('✅ Migration completed: event_id column added');
    } else {
      console.log('✅ Migration already applied: event_id column exists');
    }

    // Check if material_events table exists
    const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='material_events'");

    if (tables.length === 0) {
      console.log('📦 Creating material_events table...');

      // Read and execute material_events migration
      const migrationSQL = fs.readFileSync(
        path.join(__dirname, 'migrations', '002_material_events.sql'),
        'utf8'
      );

      await db.run(migrationSQL);
      console.log('✅ material_events table created');
    } else {
      console.log('✅ material_events table already exists');
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

module.exports = { runMigrations };
