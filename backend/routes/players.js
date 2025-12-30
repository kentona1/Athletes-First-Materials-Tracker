const express = require('express');
const router = express.Router();
const playersController = require('../controllers/playersController');

// Player CRUD routes
router.get('/', playersController.getAllPlayers.bind(playersController));
router.get('/analytics', playersController.getAnalytics.bind(playersController));
router.get('/search-espn', playersController.searchESPN.bind(playersController));
router.get('/espn-details/:id', playersController.getESPNPlayerDetails.bind(playersController));
router.get('/:id', playersController.getPlayer.bind(playersController));
router.post('/', playersController.createPlayer.bind(playersController));
router.put('/:id', playersController.updatePlayer.bind(playersController));
router.delete('/:id', playersController.deletePlayer.bind(playersController));

// Agent assignment
router.post('/assign-agent', playersController.assignAgent.bind(playersController));

module.exports = router;
