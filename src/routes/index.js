const express = require("express");
const router = express.Router();

router.use('/user', require('./user'))
router.use('/padron', require('./padron'))
router.use('/acta', require('./acta'))


module.exports = router; 