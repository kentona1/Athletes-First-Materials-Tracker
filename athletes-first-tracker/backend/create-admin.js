const bcrypt = require('bcrypt');
const db = require('./database/db');

async function createDefaultAdmin() {
  try {
    await db.initialize();
    
    // Generate hash for default password 'admin123'
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    // Check if admin exists
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    await db.run(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, ['admin', 'admin@athletesfirst.com', hash, 'admin']);
    
    console.log('✓ Default admin user created successfully!');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  IMPORTANT: Please change this password after first login!');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createDefaultAdmin();
