const router = require("express").Router();
const AdminController = require("../controllers/adminController");
const adminOnly = require("../middleware/adminOnly");
const asyncHandler = require("../helpers/asyncHandler");

router.use(adminOnly);
router.get("/reports", asyncHandler(AdminController.report));

module.exports = router;
