const router = require("express").Router();
const TemplateController = require("../controllers/templateController");
const asyncHandler = require("../helpers/asyncHandler");

router.get("/", asyncHandler(TemplateController.list));

module.exports = router;
