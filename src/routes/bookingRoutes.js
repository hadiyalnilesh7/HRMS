const router = require("express").Router();
const upload = require("../config/multerConfig");
const c = require("../controllers/bookingController");
const adminAuth = require("../middlewares/middleware");

router.get("/", adminAuth, c.listBooking);
router.post("/addBooking", adminAuth, upload.single('idProofImage'), c.addBooking);
router.post("/:bookingId/check-in", adminAuth, c.checkInBooking);
router.post("/:bookingId/check-out", adminAuth, c.checkOutBooking);
router.post("/clear-checkout", adminAuth, (req, res) => {
  delete req.session.checkoutSummary;
  res.json({ success: true });
});

module.exports = router;