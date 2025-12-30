const fs = require('fs');
const path = require('path');
const db = require('./db');

async function importSchools(skipInit = false) {
  try {
    console.log('📚 Starting schools import...');

    // Initialize database (skip if already initialized by server)
    if (!skipInit) {
      await db.initialize();
    }

    // Read CSV file
    const csvPath = path.join(__dirname, '../data/schools.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV (skip header row)
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');

    console.log('📊 CSV Headers:', headers);
    console.log(`📊 Total lines: ${lines.length - 1}`);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        skipped++;
        continue;
      }

      // Parse CSV line (handling commas in quoted fields)
      const values = parseCSVLine(line);

      if (values.length < 12) {
        console.warn(`⚠️ Skipping line ${i}: Not enough columns`);
        skipped++;
        continue;
      }

      const [id, school, mascot, abbreviation, alt_name1, alt_name2, alt_name3,
             conference, division, color, alt_color, logo, logo_dark] = values;

      try {
        await db.run(`
          INSERT OR REPLACE INTO schools
          (id, school, mascot, abbreviation, alt_name1, alt_name2, alt_name3,
           conference, division, color, alt_color, logo, logo_dark)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          parseInt(id), school, mascot, abbreviation, alt_name1, alt_name2, alt_name3,
          conference, division, color, alt_color, logo, logo_dark
        ]);

        imported++;

        if (imported % 100 === 0) {
          console.log(`  Imported ${imported} schools...`);
        }
      } catch (err) {
        console.error(`❌ Error importing school at line ${i}:`, err.message);
        console.error(`   Data:`, values.slice(0, 4));
        skipped++;
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);

    // Verify import
    const count = await db.get('SELECT COUNT(*) as count FROM schools');
    console.log(`\n📊 Total schools in database: ${count.count}`);

    // Show sample
    const samples = await db.query('SELECT * FROM schools LIMIT 5');
    console.log('\n📋 Sample schools:');
    samples.forEach(s => console.log(`   ${s.school} (${s.mascot}) - ${s.conference}`));

  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    // Only close db if we initialized it ourselves
    if (!skipInit) {
      await db.close();
    }
  }
}

// Helper function to parse CSV line (handles quoted fields)
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Push last value
  values.push(current.trim());

  return values;
}

// Run import if called directly
if (require.main === module) {
  importSchools()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n💥 Fatal error:', err);
      process.exit(1);
    });
}

module.exports = importSchools;
