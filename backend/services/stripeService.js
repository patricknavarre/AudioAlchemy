const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../models/subscription");
const User = require("../models/User");

const SUBSCRIPTION_PLANS = {
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      projectLimit: Infinity,
      storageLimit: 10,
      allowedFileTypes: ["mp3", "wav", "flac"],
      allowAdvancedFeatures: true,
      allowStemDownload: true,
      allowBatchProcessing: false,
      allowApiAccess: false,
    },
  },
  STUDIO: {
    priceId: process.env.STRIPE_STUDIO_PRICE_ID,
    features: {
      projectLimit: Infinity,
      storageLimit: 50,
      allowedFileTypes: ["mp3", "wav", "flac"],
      allowAdvancedFeatures: true,
      allowStemDownload: true,
      allowBatchProcessing: true,
      allowApiAccess: true,
    },
  },
};

class StripeService {
  // Create a Stripe checkout session
  static async createCheckoutSession(userId, planType) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const plan = SUBSCRIPTION_PLANS[planType];
      if (!plan) throw new Error("Invalid plan type");

      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user._id.toString(),
          },
        });
        stripeCustomerId = customer.id;
        user.stripeCustomerId = stripeCustomerId;
        await user.save();
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
          planType,
        },
      });

      return session;
    } catch (error) {
      console.error("Stripe checkout session error:", error);
      throw error;
    }
  }

  // Handle webhook events
  static async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutComplete(event.data.object);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionCanceled(event.data.object);
          break;
      }
    } catch (error) {
      console.error("Webhook handling error:", error);
      throw error;
    }
  }

  // Handle successful checkout
  static async handleCheckoutComplete(session) {
    const { userId, planType } = session.metadata;
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    );

    await Subscription.findOneAndUpdate(
      { userId },
      {
        plan: planType,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: "active",
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        features: SUBSCRIPTION_PLANS[planType].features,
      },
      { upsert: true }
    );
  }

  // Handle subscription updates
  static async handleSubscriptionUpdated(subscription) {
    const user = await User.findOne({
      stripeCustomerId: subscription.customer,
    });
    if (!user) return;

    await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      }
    );
  }

  // Handle subscription cancellation
  static async handleSubscriptionCanceled(subscription) {
    const user = await User.findOne({
      stripeCustomerId: subscription.customer,
    });
    if (!user) return;

    await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        status: "canceled",
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
      }
    );
  }

  // Cancel subscription
  static async cancelSubscription(userId) {
    const subscription = await Subscription.findOne({ userId });
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    return subscription;
  }
}

module.exports = StripeService;
