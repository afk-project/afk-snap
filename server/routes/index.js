const router = require("express").Router();
const authentication = require("../middleware/authentication");
const PaymentController = require("../controllers/paymentController");
const asyncHandler = require("../helpers/asyncHandler");

router.use("/auth", require("./auth"));
router.use("/templates", require("./templates"));
router.post("/payments/notification", asyncHandler(PaymentController.notification));

router.use(authentication);
router.use("/admin", require("./admin"));
router.use("/users", require("./users"));
router.use("/credits", require("./credits"));
router.use("/rooms", require("./rooms"));
router.use("/generations", require("./generations"));
router.use("/payments", require("./payments"));

module.exports = router;
