const express = require("express");
const router = express.Router();
const {
  upsertActa,
  setPhotoBase64,
  getPhoto,
  listActas,
  closeActa,
  getAllVersions,
  getTotalsByParty,
} = require("../controllers/acta");

router.post("/upsertActa", upsertActa);

router.post("/:mesaId/photo", setPhotoBase64);

router.get("/:mesaId/photo", getPhoto);

router.get("/", listActas);

router.patch("/:mesaId/close", closeActa);

router.get("/:mesaId/versions", getAllVersions);

router.get("/totales", getTotalsByParty);

module.exports = router;