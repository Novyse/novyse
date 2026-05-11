const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { withDangerousMod } = require("@expo/config-plugins");

const DENSITIES = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

module.exports = function withAndroidNotificationIcon(config, props = {}) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const iconRelativePath =
        props.iconName ?? "assets/images/notification_icon.png";
      const inputPath = path.join(
        config.modRequest.projectRoot,
        iconRelativePath,
      );

      // Extract filename without path, and ensure it follows Android naming rules (underscores only)
      const baseFileName = path.basename(iconRelativePath);
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
      );

      if (!fs.existsSync(inputPath)) {
        console.warn(
          `Notification icon not found at ${iconRelativePath}. Skipping generation!`,
        );
        return config;
      }

      console.log(
        `Generating Android notification icons from ${iconRelativePath} ...`,
      );

      await Promise.all(
        Object.entries(DENSITIES).map(async ([folder, size]) => {
          const drawableDir = path.join(resDir, `drawable-${folder}`);
          if (!fs.existsSync(drawableDir)) {
            fs.mkdirSync(drawableDir, { recursive: true });
          }

          const outputPath = path.join(drawableDir, baseFileName);

          try {
            await sharp(inputPath).resize(size, size).png().toFile(outputPath);
            console.log(
              `Created: ${path.relative(config.modRequest.projectRoot, outputPath)}`,
            );
          } catch (err) {
            console.error(`Failed to create ${folder} icon:`, err.message);
          }
        }),
      );

      console.log("Notification icons generation complete!");
      return config;
    },
  ]);
};
