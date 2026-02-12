const router = require("express").Router();
const c = require("../controllers/authController");

router.get("/", (req, res) => res.render("home"));
router.get("/login", c.loginPage);
router.post("/login", c.login);
router.get("/register", c.registerPage);
router.post("/register", c.register);
router.get("/logout", c.logout);
router.get("/forgot-password", c.forgotPasswordPage);
router.post("/forgot-password", c.forgotPassword);
router.get("/reset-password/:token", c.resetPasswordPage);
router.post("/reset-password/:token", c.resetPassword);

module.exports = router;