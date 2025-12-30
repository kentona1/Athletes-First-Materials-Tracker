const db = require('../db');

/**
 * Migration: Add recruiting info and transfer history support
 * Adds fields for high school recruiting data and transfer tracking
 */
async function migrate() {
  console.log('🔄 Running migration: add_recruiting_and_transfers');

  try {
    // Add recruiting fields to players table (if they don't exist)
    const columnsToAdd = [
      { name: 'high_school', type: 'TEXT' },
      { name: 'recruiting_class_year', type: 'INTEGER' },
      { name: 'recruiting_stars', type: 'INTEGER' },
      { name: 'recruiting_rating', type: 'REAL' },
      { name: 'recruiting_ranking', type: 'INTEGER' },
      { name: 'recruiting_state_ranking', type: 'INTEGER' },
      { name: 'recruiting_position_ranking', type: 'INTEGER' },
      { name: 'original_commitment', type: 'TEXT' }
    ];

    // Check which columns already exist
    const tableInfo = await db.query("PRAGMA table_info(players)");
    const existingColumns = tableInfo.map(col => col.name);

    // Add missing columns
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`  Adding column: ${column.name}`);
        await db.run(`ALTER TABLE players ADD COLUMN ${column.name} ${column.type}`);
      } else {
        console.log(`  Column already exists: ${column.name}`);
      }
    }

    // Create player_transfers table (if it doesn't exist)
    console.log('  Creating player_transfers table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS player_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        from_school TEXT,
        to_school TEXT NOT NULL,
        transfer_season TEXT,
        transfer_year INTEGER,
        eligibility_remaining TEXT,
        transfer_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    console.log('  Creating indexes...');
    await db.run('CREATE INDEX IF NOT EXISTS idx_transfers_player ON player_transfers(player_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_transfers_year ON player_transfers(transfer_year)');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  (async () => {
    await db.initialize();
    await migrate();
    await db.close();
    process.exit(0);
  })();
}

module.exports = migrate;
