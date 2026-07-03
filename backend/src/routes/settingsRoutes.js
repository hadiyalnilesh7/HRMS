const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const adminAuth = require("../middlewares/middleware");

router.get("/", adminAuth, settingsController.settingsPage);
router.post("/save", adminAuth, settingsController.saveSettings);
router.get("/get", adminAuth, settingsController.getSettings);

module.exports = router;