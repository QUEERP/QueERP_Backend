const express = require("express");

const controller = require("../controllers/subscriptionController");
const authMiddleware = require("../middlewares/authMiddleware");
const requireSubscriptionAdmin = require("../middlewares/subscriptionAdminMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(requireSubscriptionAdmin);

router.get("/subscription", controller.getSubscription);
router.post("/activate", authMiddleware, controller.activateSubscription);
router.post("/extend", controller.extendSubscription);
router.post("/deactivate", controller.deactivateSubscription);
router.get("/all", controller.getAllSubscriptions);
router.get("/stats", controller.getSubscriptionStats);

module.exports = router;
