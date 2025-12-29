const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Protected routes (require authentication)
router.get('/me', 
  authController.verifyToken.bind(authController),
  authController.getCurrentUser.bind(authController)
);

router.post('/change-password',
  authController.verifyToken.bind(authController),
  authController.changePassword.bind(authController)
);

// Admin only routes
router.get('/users',
  authController.verifyToken.bind(authController),
  authController.requireRole('admin').bind(authController),
  authController.getAllUsers.bind(authController)
);

router.put('/users/:id',
  authController.verifyToken.bind(authController),
  authController.requireRole('admin').bind(authController),
  authController.updateUser.bind(authController)
);

router.delete('/users/:id',
  authController.verifyToken.bind(authController),
  authController.requireRole('admin').bind(authController),
  authController.deactivateUser.bind(authController)
);

module.exports = router;
