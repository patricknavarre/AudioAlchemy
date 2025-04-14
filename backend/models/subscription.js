const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["FREE", "PRO", "STUDIO"],
      default: "FREE",
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "unpaid"],
      default: "active",
    },
    currentPeriodStart: {
      type: Date,
    },
    currentPeriodEnd: {
      type: Date,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    features: {
      projectLimit: {
        type: Number,
        default: 2, // FREE tier default
      },
      storageLimit: {
        type: Number,
        default: 0, // in GB, FREE tier default
      },
      allowedFileTypes: [
        {
          type: String,
        },
      ],
      allowAdvancedFeatures: {
        type: Boolean,
        default: false,
      },
      allowStemDownload: {
        type: Boolean,
        default: false,
      },
      allowBatchProcessing: {
        type: Boolean,
        default: false,
      },
      allowApiAccess: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if user can create more projects
subscriptionSchema.methods.canCreateProject = async function () {
  if (this.plan === "PRO" || this.plan === "STUDIO") return true;

  const Project = mongoose.model("Project");
  const currentMonth = new Date();
  currentMonth.setDate(1);

  const projectCount = await Project.countDocuments({
    userId: this.userId,
    createdAt: { $gte: currentMonth },
  });

  return projectCount < this.features.projectLimit;
};

// Method to check if user has enough storage
subscriptionSchema.methods.hasStorageSpace = async function (fileSize) {
  if (this.features.storageLimit === 0) return false;

  const Project = mongoose.model("Project");
  const projects = await Project.find({ userId: this.userId });

  let totalStorage = 0;
  projects.forEach((project) => {
    if (project.files) {
      project.files.forEach((file) => {
        totalStorage += file.size || 0;
      });
    }
    if (project.mixedFile) {
      totalStorage += project.mixedFile.size || 0;
    }
  });

  // Convert GB to bytes for comparison
  const storageLimit = this.features.storageLimit * 1024 * 1024 * 1024;
  return totalStorage + fileSize <= storageLimit;
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;
