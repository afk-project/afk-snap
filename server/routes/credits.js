const router = require("express").Router();
const CreditController = require("../controllers/creditController");
const asyncHandler = require("../helpers/asyncHandler");

router.get("/balance", asyncHandler(CreditController.balance));
router.get("/transactions", asyncHandler(CreditController.transactions));

module.exports = router;
