const express = require("express");
const {
  createPerson,
  listPadron,
  listByMesa,
  getPerson,
  updatePerson,
  deletePerson,
  markVote,
  unmarkVote,
  mesaStats,
} = require("../controllers/padron");

const { decodeToken, adminRequiredValidation } = require("../middlewares/auth");

const router = express.Router();

router.use(decodeToken);

router.get("/", listPadron);

router.get("/mesa/:mesa", listByMesa);

router.get("/mesa/:mesa/stats", adminRequiredValidation, mesaStats);

router.get("/:id", getPerson);

router.post("/", adminRequiredValidation, createPerson);

router.patch("/:id", adminRequiredValidation, updatePerson);

router.patch("/:id/vote", markVote);

router.patch("/:id/unvote", adminRequiredValidation, unmarkVote);

router.delete("/:id", adminRequiredValidation, deletePerson);

module.exports = router;