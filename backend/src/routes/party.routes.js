const express = require("express");
const multer = require("multer");
const partyController = require("../controllers/party.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.get("/party", requireAuth, partyController.listParty);
router.get("/party/:id", requireAuth, partyController.getPartyNode);
router.post("/party", requireAuth, partyController.createPartyNode);
router.put("/party/:id", requireAuth, partyController.updatePartyNode);
router.delete("/party/:id", requireAuth, partyController.deletePartyNode);

router.get("/party/:id/members", requireAuth, partyController.listNodeMembers);
router.post("/party/:id/members", requireAuth, partyController.addMember);
router.put("/party/members/:id", requireAuth, partyController.updateMember);
router.delete("/party/members/:id", requireAuth, partyController.deleteMember);

router.post(
    "/party/import",
    requireAuth,
    upload.single("file"),
    partyController.importMembers
);

module.exports = router;