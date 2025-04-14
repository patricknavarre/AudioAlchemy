const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const StripeService = require("../services/stripeService");
const Subscription = require("../models/subscription");

// Get current subscription
router.get("/current", auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription) {
      // Create a free subscription if none exists
      const newSubscription = new Subscription({
        userId: req.user.id,
        plan: "FREE",
        features: {
          projectLimit: 2,
          storageLimit: 0,
          allowedFileTypes: ["mp3"],
          allowAdvancedFeatures: false,
          allowStemDownload: false,
          allowBatchProcessing: false,
          allowApiAccess: false,
        },
      });
      await newSubscription.save();
      return res.json(newSubscription);
    }
    res.json(subscription);
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create checkout session
router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const { planType } = req.body;
    if (!planType || !["PRO", "STUDIO"].includes(planType)) {
      return res.status(400).json({ message: "Invalid plan type" });
    }

    const session = await StripeService.createCheckoutSession(
      req.user.id,
      planType
    );
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
});

// Cancel subscription
router.post("/cancel", auth, async (req, res) => {
  try {
    const subscription = await StripeService.cancelSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ message: "Failed to cancel subscription" });
  }
});

// Stripe webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      await StripeService.handleWebhookEvent(event);
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(400).json({ message: "Webhook error" });
    }
  }
);

module.exports = router;
