const router = require("express").Router();
const c = require("../controllers/roomController");
const adminAuth = require("../middlewares/middleware");

router.get("/", adminAuth, c.list);
router.post("/add", adminAuth, c.add);
router.post("/delete", adminAuth, c.delete);
router.post("/editRoom", adminAuth, c.edit);
router.post("/:id", adminAuth, c.update);

module.exports = router;
