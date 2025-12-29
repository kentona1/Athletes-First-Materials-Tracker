const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');

router.get('/', agentsController.getAllAgents.bind(agentsController));
router.get('/performance', agentsController.getAgentPerformance.bind(agentsController));
router.get('/:id', agentsController.getAgent.bind(agentsController));
router.post('/', agentsController.createAgent.bind(agentsController));
router.put('/:id', agentsController.updateAgent.bind(agentsController));

module.exports = router;
