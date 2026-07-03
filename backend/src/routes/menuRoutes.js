const router = require("express").Router();
const c = require("../controllers/menuController");
const adminAuth = require("../middlewares/middleware");

router.get("/", adminAuth, c.menuPage);
router.post("/addMenu", adminAuth, c.addMenu);
router.post("/delete", adminAuth, c.deleteMenu);
router.post("/edit", adminAuth, c.editMenu);
router.post("/update", adminAuth, c.updateMenu);

module.exports = router;