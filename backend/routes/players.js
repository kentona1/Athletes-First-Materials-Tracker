const express = require('express');
const router = express.Router();
const playersController = require('../controllers/playersController');

// Player CRUD routes
router.get('/', playersController.getAllPlayers.bind(playersController));
router.get('/analytics', playersController.getAnalytics.bind(playersController));
router.get('/search-espn', playersController.searchESPN.bind(playersController));
router.get('/search-nfl', playersController.searchNFL.bind(playersController));
router.get('/search-cfbd', playersController.searchCFBD.bind(playersController));
router.get('/search-hs-recruits', playersController.searchHSRecruits.bind(playersController));
router.get('/nfl-details/:id', playersController.getNFLPlayerDetails.bind(playersController));
router.get('/recruiting-data', playersController.getRecruitingData.bind(playersController));
router.get('/transfer-data', playersController.getTransferData.bind(playersController));
router.get('/espn-details/:id', playersController.getESPNPlayerDetails.bind(playersController));
router.get('/:id/transfers', playersController.getPlayerTransfers.bind(playersController));
router.get('/:id', playersController.getPlayer.bind(playersController));
router.post('/', playersController.createPlayer.bind(playersController));
router.post('/transfers', playersController.addPlayerTransfer.bind(playersController));
router.put('/:id', playersController.updatePlayer.bind(playersController));
router.delete('/:id', playersController.deletePlayer.bind(playersController));

// Agent assignment
router.post('/assign-agent', playersController.assignAgent.bind(playersController));

// Player outcome/status management
router.put('/:id/outcome', playersController.updatePlayerOutcome.bind(playersController));

module.exports = router;
