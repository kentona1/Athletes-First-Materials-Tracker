const express = require('express');
const router = express.Router();
const materialsController = require('../controllers/materialsController');

// Material types
router.get('/types', materialsController.getMaterialTypes.bind(materialsController));
router.post('/types', materialsController.addMaterialType.bind(materialsController));

// Material logging (legacy single-material)
router.post('/', materialsController.logMaterial.bind(materialsController));
router.post('/batch', materialsController.batchLogMaterials.bind(materialsController));
router.get('/player/:playerId', materialsController.getPlayerMaterials.bind(materialsController));
router.put('/:id', materialsController.updateMaterial.bind(materialsController));
router.delete('/:id', materialsController.deleteMaterial.bind(materialsController));

// Material Events (new event-based batch logging)
router.post('/events', materialsController.createMaterialEvent.bind(materialsController));
router.get('/events/:playerId', materialsController.getPlayerEvents.bind(materialsController));
router.put('/events/:eventId', materialsController.updateMaterialEvent.bind(materialsController));
router.delete('/events/:eventId', materialsController.deleteMaterialEvent.bind(materialsController));

// Analytics
router.get('/summary', materialsController.getMaterialsSummary.bind(materialsController));

// Contacts
router.post('/contacts', materialsController.logContact.bind(materialsController));

module.exports = router;
