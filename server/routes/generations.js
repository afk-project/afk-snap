const router = require("express").Router();
const GenerationController = require("../controllers/generationController");
const asyncHandler = require("../helpers/asyncHandler");
const upload = require("../middleware/upload");

router.get("/", asyncHandler(GenerationController.list));
router.get("/:id", asyncHandler(GenerationController.detail));
router.post("/", upload.array("photos", 6), asyncHandler(GenerationController.create));

module.exports = router;
