const db = require('../database/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { username, email, password, role, agentId } = req.body;

      // Check if user exists
      const existingUser = await db.get(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username or email already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const result = await db.run(`
        INSERT INTO users (username, email, password_hash, role, agent_id)
        VALUES (?, ?, ?, ?, ?)
      `, [username, email, passwordHash, role || 'viewer', agentId]);

      res.json({
        success: true,
        message: 'User created successfully',
        userId: result.id
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Get user
      const user = await db.get(
        'SELECT * FROM users WHERE username = ? AND active = 1',
        [username]
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password'
        });
      }

      // Update last login
      await db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role,
          agentId: user.agent_id
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          agentId: user.agent_id
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Verify token middleware
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  }

  // Check if user has required role
  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Get current user info
  async getCurrentUser(req, res) {
    try {
      const user = await db.get(
        'SELECT id, username, email, role, agent_id, created_at, last_login FROM users WHERE id = ?',
        [req.user.userId]
      );

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const users = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.agent_id,
          a.name as agent_name,
          u.active,
          u.created_at,
          u.last_login
        FROM users u
        LEFT JOIN agents a ON u.agent_id = a.id
        ORDER BY u.created_at DESC
      `);

      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating password here (separate endpoint)
      delete updates.password;
      delete updates.password_hash;

      const fields = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      values.push(id);

      await db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ success: true, message: 'User updated' });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Get user
      const user = await db.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      );

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await db.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, userId]
      );

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Deactivate user
  async deactivateUser(req, res) {
    try {
      const { id } = req.params;

      await db.run(
        'UPDATE users SET active = 0 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'User deactivated'
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AuthController();
