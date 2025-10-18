const express = require("express");
const router = express.Router();
const { upsertActa, setPhotoBase64, getPhoto, listActas, deleteActa, getTotalsByParty } = require("../controllers/acta");


router.post('/upsertActa', upsertActa);

router.post('/:mesaId/photo', setPhotoBase64);

router.get('/:mesaId/photo', getPhoto);

router.get('/', listActas);

router.delete('/:mesaId', deleteActa);

router.get('/totales', getTotalsByParty);

module.exports = router; 