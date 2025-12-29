const express = require('express');
const router = express.Router();
const materialsController = require('../controllers/materialsController');

// Material types
router.get('/types', materialsController.getMaterialTypes.bind(materialsController));
router.post('/types', materialsController.addMaterialType.bind(materialsController));

// Material logging
router.post('/', materialsController.logMaterial.bind(materialsController));
router.post('/batch', materialsController.batchLogMaterials.bind(materialsController));
router.get('/player/:playerId', materialsController.getPlayerMaterials.bind(materialsController));
router.put('/:id', materialsController.updateMaterial.bind(materialsController));
router.delete('/:id', materialsController.deleteMaterial.bind(materialsController));

// Analytics
router.get('/summary', materialsController.getMaterialsSummary.bind(materialsController));

// Contacts
router.post('/contacts', materialsController.logContact.bind(materialsController));

module.exports = router;
