const router = require("express").Router();
const UserController = require("../controllers/userController");
const asyncHandler = require("../helpers/asyncHandler");

router.get("/me", asyncHandler(UserController.me));
router.patch("/me", asyncHandler(UserController.updateMe));

module.exports = router;
