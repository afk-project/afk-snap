const router = require("express").Router();
const PaymentController = require("../controllers/paymentController");
const asyncHandler = require("../helpers/asyncHandler");

router.get("/packages", asyncHandler(PaymentController.packages));
router.get("/orders", asyncHandler(PaymentController.orders));
router.post("/checkout", asyncHandler(PaymentController.checkout));
router.post("/sync", asyncHandler(PaymentController.sync));

module.exports = router;
