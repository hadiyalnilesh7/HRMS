const router = require("express").Router();
const upload = require("../config/multerConfig");
const c = require("../controllers/bookingController");
const adminAuth = require("../middlewares/middleware");

const handleBookingUpload = (req, res, next) => {
  upload.single('idProofImage')(req, res, (err) => {
    if (err) {
      console.error("Booking upload error:", err);
      return res.status(400).send(err.message || "Unable to upload ID proof image");
    }

    return next();
  });
};

router.get("/", adminAuth, c.listBooking);
router.post("/addBooking", adminAuth, handleBookingUpload, c.addBooking);
router.post("/:bookingId/check-in", adminAuth, c.checkInBooking);
router.post("/:bookingId/check-out", adminAuth, c.checkOutBooking);
router.post("/clear-checkout", adminAuth, (req, res) => {
  delete req.session.checkoutSummary;
  res.json({ success: true });
});

module.exports = router;