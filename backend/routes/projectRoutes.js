// Loudness measurement route
router.get(
  "/:id/loudness",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project || !project.mixedFile) {
      return res.status(404).json({ message: "Mix not found" });
    }

    const measurements = await audioProcessor.measureLoudness(
      project.mixedFile.path
    );
    res.json(measurements);
  })
);

// Loudness normalization route
router.post(
  "/:id/normalize",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { targetLUFS } = req.body;

    if (
      typeof targetLUFS !== "number" ||
      targetLUFS > -14 ||
      targetLUFS < -23
    ) {
      return res.status(400).json({
        message: "Invalid target LUFS. Must be between -23 and -14 LUFS",
      });
    }

    const project = await Project.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!project || !project.mixedFile) {
      return res.status(404).json({ message: "Mix not found" });
    }

    const normalizedFileName = `normalized_${Date.now()}_${path.basename(
      project.mixedFile.path
    )}`;
    const normalizedPath = path.join(MIXED_DIR, normalizedFileName);

    const result = await audioProcessor.normalizeLoudness(
      project.mixedFile.path,
      normalizedPath,
      targetLUFS
    );

    // Update project with new normalized mix
    project.mixedFile = {
      fileName: normalizedFileName,
      path: normalizedPath,
      createdAt: new Date(),
      loudness: {
        targetLUFS,
        originalLUFS: result.originalLoudness,
        adjustment: result.adjustedBy,
      },
    };

    await project.save();

    res.json({
      message: "Mix normalized successfully",
      loudness: project.mixedFile.loudness,
    });
  })
);
