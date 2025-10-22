const express = require("express");
const router = express.Router();
const {
  upsertActa,
  setPhotoBase64,
  getPhoto,
  listActas,
  getTotalsByParty,
  getActaByMesa,
} = require("../controllers/acta");

router.post("/upsertActa", upsertActa);
router.post("/:mesaId/photo", setPhotoBase64);
router.get("/:mesaId/photo", getPhoto);
router.get("/", listActas);
router.get("/totales", getTotalsByParty);
router.get("/mesa/:mesaId", getActaByMesa);
router.get("/varias", getActaByMesa);

module.exports = router;