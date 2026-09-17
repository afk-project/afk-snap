const router = require("express").Router();
const RoomController = require("../controllers/roomController");
const roomAccess = require("../middleware/roomAccess");
const asyncHandler = require("../helpers/asyncHandler");
const upload = require("../middleware/upload");

router.get("/", asyncHandler(RoomController.list));
router.post("/", asyncHandler(RoomController.create));
router.post("/join", asyncHandler(RoomController.join));
router.get("/:roomId", roomAccess, asyncHandler(RoomController.detail));
router.get("/:roomId/messages", roomAccess, asyncHandler(RoomController.messages));
router.post("/:roomId/photos", roomAccess, upload.single("photo"), asyncHandler(RoomController.uploadPhoto));
router.delete("/:roomId/photos/:assetId", roomAccess, asyncHandler(RoomController.deletePhoto));

module.exports = router;
