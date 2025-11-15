/**
 * Color extraction and gradient utilities for user avatars
 * Inspired by Google Meet's gradient background system
 */

/**
 * Predefined gradient palettes for fallback (Google Meet style)
 */
const GRADIENT_PALETTES = [
  ["#667eea", "#764ba2"], // Purple blue
  ["#f093fb", "#f5576c"], // Pink red
  ["#4facfe", "#00f2fe"], // Blue cyan
  ["#43e97b", "#38f9d7"], // Green cyan
  ["#fa709a", "#fee140"], // Pink yellow
  ["#a8edea", "#fed6e3"], // Cyan pink light
  ["#ffecd2", "#fcb69f"], // Orange peach
  ["#ff9a9e", "#fecfef"], // Pink purple light
  ["#ffecd2", "#fcb69f"], // Warm orange
  ["#a8edea", "#fed6e3"], // Cool mint
  ["#d299c2", "#fef9d7"], // Purple yellow
  ["#89f7fe", "#66a6ff"], // Light blue
];

/**
 * Extract dominant colors from an image using canvas analysis
 * @param {string} imageUri - The image URI to analyze
 * @returns {Promise<{r: number, g: number, b: number}[]>} Array of RGB color objects
 */
const extractColorsFromImage = async (imageUri) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're in a web environment
      if (typeof document === "undefined") {
        reject(new Error("Canvas not available in this environment"));
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          // Set small canvas size for performance
          const size = 50;
          canvas.width = size;
          canvas.height = size;

          // Draw image scaled to canvas
          ctx.drawImage(img, 0, 0, size, size);

          // Get image data
          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          // Color clustering
          const colorClusters = {};
          const threshold = 32; // Color grouping threshold

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            // Skip transparent or very dark/light pixels
            if (alpha < 128 || r + g + b < 50 || r + g + b > 700) continue;

            // Cluster similar colors
            const clusterR = Math.round(r / threshold) * threshold;
            const clusterG = Math.round(g / threshold) * threshold;
            const clusterB = Math.round(b / threshold) * threshold;

            const key = `${clusterR}-${clusterG}-${clusterB}`;

            if (!colorClusters[key]) {
              colorClusters[key] = {
                r: clusterR,
                g: clusterG,
                b: clusterB,
                count: 0,
              };
            }
            colorClusters[key].count++;
          }

          // Sort by frequency and return top colors
          const sortedColors = Object.values(colorClusters)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          resolve(sortedColors);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = imageUri;
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert RGB to HSL for color manipulation
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{h: number, s: number, l: number}} HSL values
 */
const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

/**
 * Convert HSL back to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {{r: number, g: number, b: number}} RGB values
 */
const hslToRgb = (h, s, l) => {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

/**
 * Generate a harmonious gradient from dominant colors (Google Meet style)
 * @param {{r: number, g: number, b: number}[]} dominantColors - Array of dominant colors
 * @returns {string[]} Array of hex color strings for gradient
 */
const generateGradientFromColors = (dominantColors) => {
  if (!dominantColors || dominantColors.length === 0) {
    return GRADIENT_PALETTES[0];
  }

  // Take the most dominant color as base
  const baseColor = dominantColors[0];
  const { h, s, l } = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

  // Create gradient variations
  const color1Hsl = {
    h: h,
    s: Math.max(40, Math.min(80, s)), // Ensure good saturation
    l: Math.max(35, Math.min(65, l)), // Ensure good lightness
  };

  const color2Hsl = {
    h: (h + 60) % 360, // Complementary hue
    s: Math.max(40, Math.min(80, s + 10)),
    l: Math.max(25, Math.min(55, l - 15)), // Slightly darker
  };

  // Convert back to RGB then hex
  const color1Rgb = hslToRgb(color1Hsl.h, color1Hsl.s, color1Hsl.l);
  const color2Rgb = hslToRgb(color2Hsl.h, color2Hsl.s, color2Hsl.l);

  const toHex = (rgb) => {
    const hex = (n) => n.toString(16).padStart(2, "0");
    return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
  };

  return [toHex(color1Rgb), toHex(color2Rgb)];
};

/**
 * Get fallback gradient colors based on user handle (deterministic)
 * @param {string} userHandle - User's handle/name
 * @returns {string[]} Array of hex color strings
 */
const getFallbackGradient = (userHandle) => {
  // Usa un hash del nome utente per colori deterministici
  let hash = 0;
  if (userHandle) {
    for (let i = 0; i < userHandle.length; i++) {
      const char = userHandle.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
};

/**
 * Main function to extract dominant colors and generate gradient
 * @param {string} imageUri - Image URI to analyze
 * @param {string} userHandle - User handle for fallback
 * @returns {Promise<string[]>} Promise resolving to gradient colors
 */
export const extractDominantColors = async (imageUri, userHandle = "") => {
  try {
    // Try to extract colors from image
    if (imageUri) {
      if (typeof document !== "undefined") {
        const dominantColors = await extractColorsFromImage(imageUri);
        const gradientColors = generateGradientFromColors(dominantColors);
        return gradientColors;
      }
    }
  } catch (error) {
    // Silently fall through to fallback
  }

  // Fallback to deterministic gradient based on user handle
  const fallbackColors = getFallbackGradient(userHandle);
  return fallbackColors;
};

/**
 * Get first letter of user handle for avatar fallback
 * @param {string} userHandle - User's handle/name
 * @returns {string} First letter uppercase
 */
export const getFirstLetter = (userHandle) => {
  if (!userHandle || typeof userHandle !== "string") return "?";
  return userHandle.charAt(0).toUpperCase();
};

/**
 * Generate gradient colors for web fallback (CSS compatible)
 * @param {string} userHandle - User handle for deterministic colors
 * @returns {string} CSS gradient string
 */
export const generateWebGradient = (userHandle) => {
  const colors = getFallbackGradient(userHandle);
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
};

// Export default per compatibilità routing
export default {
  extractDominantColors,
  getFirstLetter,
  generateWebGradient,
};
