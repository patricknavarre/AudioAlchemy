import { useCart } from "../../context/CartContext";
import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";

const SUBSCRIPTION_PLANS = {
  PRO: {
    id: "pro-plan",
    name: "Pro Plan",
    price: 9.99,
    description: "Advanced audio processing features",
    features: [
      "Unlimited projects",
      "Advanced stem separation",
      "High-quality export (WAV, FLAC)",
      "Advanced mixing features",
      "10GB cloud storage",
      "Download individual stems",
      "Priority processing",
    ],
  },
  STUDIO: {
    id: "studio-plan",
    name: "Studio Plan",
    price: 24.99,
    description: "Professional studio features",
    features: [
      "All Pro features",
      "Ultra HD export (32-bit WAV)",
      "50GB cloud storage",
      "Batch processing",
      "API access",
      "Priority support",
    ],
  },
};

export default function Cart() {
  const { cart, total, removeFromCart, updateQuantity, addToCart } = useCart();

  const handleQuantityChange = (productId, newQuantity) => {
    updateQuantity(productId, parseInt(newQuantity));
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
  };

  const handleAddToCart = (plan) => {
    addToCart(plan);
    toast.success(`${plan.name} added to cart!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Your Cart</h1>

        {cart.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
            <p className="text-xl text-purple-200">Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-white/10 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white">
                        {item.name}
                      </h3>
                      <p className="text-purple-200">{item.description}</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity - 1)
                          }
                          className="p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                        >
                          <FiMinus />
                        </button>
                        <span className="text-white w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, item.quantity + 1)
                          }
                          className="p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                        >
                          <FiPlus />
                        </button>
                      </div>

                      <div className="text-white w-24 text-right">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Summary */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg text-purple-200">Subtotal</span>
                <span className="text-2xl font-bold text-white">
                  ${total.toFixed(2)}
                </span>
              </div>

              <button
                onClick={() => {
                  // TODO: Implement checkout
                  alert("Checkout functionality coming soon!");
                }}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            Available Subscription Plans
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <div
                key={key}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10"
              >
                <h3 className="text-xl font-bold text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-2xl font-bold text-purple-200 mb-4">
                  ${plan.price}/month
                </p>
                <p className="text-purple-200 mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-sm text-purple-200"
                    >
                      <span className="mr-2">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleAddToCart(plan)}
                  className="w-full py-2 px-4 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors"
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
