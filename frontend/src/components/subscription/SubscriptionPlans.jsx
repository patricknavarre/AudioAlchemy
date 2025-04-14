import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "react-hot-toast";
import { FiCheck, FiX } from "react-icons/fi";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: [
      "2 projects per month",
      "Basic stem separation",
      "Standard quality export (MP3)",
      "Basic mixing features",
      { text: "Cloud storage", included: false },
      { text: "Download individual stems", included: false },
      { text: "Advanced mixing features", included: false },
      { text: "Batch processing", included: false },
      { text: "API access", included: false },
    ],
  },
  PRO: {
    name: "Pro",
    price: 9.99,
    features: [
      "Unlimited projects",
      "Advanced stem separation",
      "High-quality export (WAV, FLAC)",
      "Advanced mixing features",
      "10GB cloud storage",
      "Download individual stems",
      "Priority processing",
      { text: "Batch processing", included: false },
      { text: "API access", included: false },
    ],
  },
  STUDIO: {
    name: "Studio",
    price: 24.99,
    features: [
      "Unlimited projects",
      "Advanced stem separation",
      "Ultra HD export (32-bit WAV)",
      "Advanced mixing features",
      "50GB cloud storage",
      "Download individual stems",
      "Priority processing",
      "Batch processing",
      "API access",
    ],
  },
};

export default function SubscriptionPlans() {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/subscription/current`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setCurrentPlan(response.data.plan);
      } catch (error) {
        console.error("Error fetching subscription:", error);
        toast.error("Failed to load subscription details");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentSubscription();
  }, []);

  const handleUpgrade = async (planType) => {
    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL
        }/api/subscription/create-checkout-session`,
        { planType },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.sessionId,
      });

      if (error) {
        console.error("Stripe checkout error:", error);
        toast.error("Failed to start checkout process");
      }
    } catch (error) {
      console.error("Create checkout session error:", error);
      toast.error("Failed to start checkout process");
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/subscription/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Subscription cancelled successfully");
      setCurrentPlan("FREE");
    } catch (error) {
      console.error("Cancel subscription error:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-200"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-purple-200">
            Select the perfect plan for your music production needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {Object.entries(PLANS).map(([planType, plan]) => (
            <div
              key={planType}
              className={`rounded-lg shadow-xl bg-white/10 backdrop-blur-lg divide-y divide-white/20 ${
                currentPlan === planType ? "ring-4 ring-purple-500" : ""
              }`}
            >
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-white leading-6">
                  {plan.name}
                </h3>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-base font-medium text-purple-200">
                    /mo
                  </span>
                </p>
                <p className="mt-4 text-sm text-purple-200">
                  {planType === "FREE"
                    ? "Perfect for getting started"
                    : planType === "PRO"
                    ? "Best for professional producers"
                    : "Ultimate power for studios"}
                </p>
              </div>
              <div className="px-6 pt-6 pb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => {
                    const isIncluded =
                      typeof feature === "string" ||
                      (typeof feature === "object" &&
                        feature.included !== false);
                    const featureText =
                      typeof feature === "string" ? feature : feature.text;

                    return (
                      <li key={index} className="flex items-start">
                        <div className="flex-shrink-0">
                          {isIncluded ? (
                            <FiCheck className="h-6 w-6 text-green-400" />
                          ) : (
                            <FiX className="h-6 w-6 text-red-400" />
                          )}
                        </div>
                        <p
                          className={`ml-3 text-base ${
                            isIncluded
                              ? "text-purple-200"
                              : "text-purple-200/50"
                          }`}
                        >
                          {featureText}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-8">
                  {currentPlan === planType ? (
                    planType !== "FREE" ? (
                      <button
                        onClick={handleCancel}
                        className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-purple-600 bg-purple-200 hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        Cancel Plan
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-500/50 cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planType)}
                      className={`w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        planType === "FREE"
                          ? "bg-purple-500/50 cursor-not-allowed"
                          : "bg-purple-500 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      }`}
                      disabled={planType === "FREE"}
                    >
                      {planType === "FREE"
                        ? "Free Plan"
                        : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
