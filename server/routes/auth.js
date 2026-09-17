const router = require("express").Router();
const AuthController = require("../controllers/authController");
const asyncHandler = require("../helpers/asyncHandler");

router.post("/register", asyncHandler(AuthController.register));
router.post("/login", asyncHandler(AuthController.login));
router.post("/google", asyncHandler(AuthController.google));
router.post("/forgot-password", asyncHandler(AuthController.forgotPassword));
router.post("/reset-password", asyncHandler(AuthController.resetPassword));

module.exports = router;
