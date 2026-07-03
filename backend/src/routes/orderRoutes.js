const router = require("express").Router();
const c = require("../controllers/orderController");
const adminAuth = require("../middlewares/middleware");

router.get("/", adminAuth, c.orderPage);
router.post("/addOrder", adminAuth,  c.addOrder);
router.post("/:orderId/delivery", adminAuth, c.updateDeliveryStatus);

module.exports = router;