/**
 * Media Utility Functions
 * Provides media-specific utility functions for WebRTC operations
 */

import { LogLevels } from "../logging/LogLevels.js";
import { createMediaStream } from "./compatibility.js";

export class MediaUtils {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Get optimal video constraints based on device and network
   * @param {object} options - Configuration options
   * @returns {object} Optimized video constraints
   */
  getOptimalVideoConstraints(options = {}) {
    const {
      quality = "medium",
      facingMode = "user",
      aspectRatio = 16 / 9,
      networkType = "unknown",
    } = options;

    const baseConstraints = {
      video: {
        facingMode,
        aspectRatio,
      },
    };

    // Adjust based on quality preference
    switch (quality) {
      case "low":
        baseConstraints.video.width = { ideal: 320 };
        baseConstraints.video.height = { ideal: 240 };
        baseConstraints.video.frameRate = { ideal: 15, max: 20 };
        break;
      case "medium":
        baseConstraints.video.width = { ideal: 640 };
        baseConstraints.video.height = { ideal: 480 };
        baseConstraints.video.frameRate = { ideal: 24, max: 30 };
        break;
      case "high":
        baseConstraints.video.width = { ideal: 1280 };
        baseConstraints.video.height = { ideal: 720 };
        baseConstraints.video.frameRate = { ideal: 30 };
        break;
      case "ultra":
        baseConstraints.video.width = { ideal: 1920 };
        baseConstraints.video.height = { ideal: 1080 };
        baseConstraints.video.frameRate = { ideal: 30 };
        break;
    }

    // Adjust based on network conditions
    if (networkType === "slow-2g" || networkType === "2g") {
      baseConstraints.video.width = { ideal: 160 };
      baseConstraints.video.height = { ideal: 120 };
      baseConstraints.video.frameRate = { ideal: 10, max: 15 };
    } else if (networkType === "3g") {
      baseConstraints.video.width = { ideal: 320 };
      baseConstraints.video.height = { ideal: 240 };
      baseConstraints.video.frameRate = { ideal: 15, max: 20 };
    }

    this.logger?.log(
      LogLevels.DEBUG,
      "Generated optimal video constraints",
      baseConstraints
    );
    return baseConstraints;
  }

  /**
   * Get optimal audio constraints
   * @param {object} options - Configuration options
   * @returns {object} Optimized audio constraints
   */
  getOptimalAudioConstraints(options = {}) {
    const {
      echoCancellation = true,
      noiseSuppression = true,
      autoGainControl = true,
      sampleRate = 44100,
      channelCount = 1,
    } = options;

    const constraints = {
      audio: {
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        sampleRate: { ideal: sampleRate },
        channelCount: { ideal: channelCount },
      },
    };

    this.logger?.log(
      LogLevels.DEBUG,
      "Generated optimal audio constraints",
      constraints
    );
    return constraints;
  }

  /**
   * Check if device supports specific media constraints
   * @param {object} constraints - Media constraints to check
   * @returns {Promise<boolean>} True if constraints are supported
   */
  async supportsConstraints(constraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Check if we got what we asked for
      const tracks = stream.getTracks();
      let supported = true;

      for (const track of tracks) {
        const settings = track.getSettings();
        const capabilities = track.getCapabilities();

        // Basic validation - this could be more sophisticated
        if (constraints.video && track.kind === "video") {
          if (
            constraints.video.width &&
            settings.width < constraints.video.width.min
          ) {
            supported = false;
          }
        }

        track.stop();
      }

      this.logger?.log(LogLevels.DEBUG, "Constraints support check", {
        constraints,
        supported,
      });
      return supported;
    } catch (error) {
      this.logger?.log(LogLevels.WARNING, "Constraints not supported", {
        constraints,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get fallback constraints for failed media access
   * @param {Error} error - Original error
   * @param {object} originalConstraints - Original constraints that failed
   * @returns {object} Fallback constraints
   */
  getFallbackConstraints(error, originalConstraints) {
    const fallback = { audio: false, video: false };

    // If video failed, try audio only
    if (originalConstraints.video && error.name === "NotFoundError") {
      fallback.audio = originalConstraints.audio || true;
      this.logger?.log(
        LogLevels.INFO,
        "Falling back to audio only due to video error"
      );
    }
    // If permissions denied, try most basic constraints
    else if (error.name === "NotAllowedError") {
      fallback.audio = true;
      this.logger?.log(
        LogLevels.INFO,
        "Falling back to basic audio due to permissions"
      );
    }
    // For other errors, try very basic constraints
    else {
      fallback.audio = { echoCancellation: false, noiseSuppression: false };
      this.logger?.log(
        LogLevels.INFO,
        "Falling back to minimal audio constraints"
      );
    }

    return fallback;
  }

  /**
   * Analyze media stream quality
   * @param {MediaStream} stream - Stream to analyze
   * @returns {object} Quality analysis
   */
  analyzeStreamQuality(stream) {
    const analysis = {
      tracks: [],
      overall: "unknown",
    };

    for (const track of stream.getTracks()) {
      const settings = track.getSettings();
      const trackAnalysis = {
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings,
      };

      if (track.kind === "video") {
        trackAnalysis.quality = this.getVideoQualityRating(settings);
      } else if (track.kind === "audio") {
        trackAnalysis.quality = this.getAudioQualityRating(settings);
      }

      analysis.tracks.push(trackAnalysis);
    }

    // Determine overall quality
    const qualities = analysis.tracks.map((t) => t.quality).filter((q) => q);
    if (qualities.length > 0) {
      const avgQuality =
        qualities.reduce((sum, q) => {
          const score = { low: 1, medium: 2, high: 3, ultra: 4 }[q] || 0;
          return sum + score;
        }, 0) / qualities.length;

      if (avgQuality >= 3.5) analysis.overall = "ultra";
      else if (avgQuality >= 2.5) analysis.overall = "high";
      else if (avgQuality >= 1.5) analysis.overall = "medium";
      else analysis.overall = "low";
    }

    this.logger?.log(LogLevels.DEBUG, "Stream quality analysis", analysis);
    return analysis;
  }

  /**
   * Rate video quality based on settings
   * @param {object} settings - Video track settings
   * @returns {string} Quality rating
   */
  getVideoQualityRating(settings) {
    const { width = 0, height = 0, frameRate = 0 } = settings;
    const pixels = width * height;

    if (pixels >= 1920 * 1080 && frameRate >= 25) return "ultra";
    if (pixels >= 1280 * 720 && frameRate >= 20) return "high";
    if (pixels >= 640 * 480 && frameRate >= 15) return "medium";
    return "low";
  }

  /**
   * Rate audio quality based on settings
   * @param {object} settings - Audio track settings
   * @returns {string} Quality rating
   */
  getAudioQualityRating(settings) {
    const {
      sampleRate = 0,
      channelCount = 0,
      echoCancellation = false,
      noiseSuppression = false,
    } = settings;

    if (
      sampleRate >= 44100 &&
      channelCount >= 2 &&
      echoCancellation &&
      noiseSuppression
    ) {
      return "ultra";
    }
    if (sampleRate >= 22050 && echoCancellation && noiseSuppression) {
      return "high";
    }
    if (sampleRate >= 16000 && (echoCancellation || noiseSuppression)) {
      return "medium";
    }
    return "low";
  }

  /**
   * Convert MediaStream to different formats
   * @param {MediaStream} stream - Source stream
   * @param {object} options - Conversion options
   * @returns {Promise<Blob>} Converted media data
   */
  async convertStream(stream, options = {}) {
    const {
      format = "webm",
      videoBitsPerSecond = 1000000,
      audioBitsPerSecond = 128000,
      duration = 10000, // 10 seconds max
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: `video/${format}`,
          videoBitsPerSecond,
          audioBitsPerSecond,
        });

        const chunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: `video/${format}` });
          resolve(blob);
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event.error}`));
        };

        mediaRecorder.start();

        // Stop after specified duration
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }, duration);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clone a MediaStream with specific tracks
   * @param {MediaStream} originalStream - Source stream
   * @param {object} options - Cloning options
   * @returns {MediaStream} Cloned stream
   */ cloneStream(originalStream, options = {}) {
    const { includeAudio = true, includeVideo = true } = options;

    const clonedStream = createMediaStream();

    for (const track of originalStream.getTracks()) {
      if (
        (track.kind === "audio" && includeAudio) ||
        (track.kind === "video" && includeVideo)
      ) {
        clonedStream.addTrack(track.clone());
      }
    }

    this.logger?.log(LogLevels.DEBUG, "Stream cloned", {
      originalTracks: originalStream.getTracks().length,
      clonedTracks: clonedStream.getTracks().length,
      options,
    });

    return clonedStream;
  }

  /**
   * Apply audio filters to a stream
   * @param {MediaStream} stream - Source stream
   * @param {object} filters - Audio filters to apply
   * @returns {Promise<MediaStream>} Filtered stream
   */
  async applyAudioFilters(stream, filters = {}) {
    const { volume = 1.0, highpass = null, lowpass = null, gain = 0 } = filters;

    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      let currentNode = source;

      // Apply volume
      if (volume !== 1.0) {
        const gainNode = audioContext.createGain();
        gainNode.gain.value = volume;
        currentNode.connect(gainNode);
        currentNode = gainNode;
      }

      // Apply highpass filter
      if (highpass) {
        const filter = audioContext.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = highpass;
        currentNode.connect(filter);
        currentNode = filter;
      }

      // Apply lowpass filter
      if (lowpass) {
        const filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = lowpass;
        currentNode.connect(filter);
        currentNode = filter;
      }

      // Apply gain
      if (gain !== 0) {
        const gainNode = audioContext.createGain();
        gainNode.gain.value = Math.pow(10, gain / 20); // Convert dB to linear
        currentNode.connect(gainNode);
        currentNode = gainNode;
      }

      currentNode.connect(destination);

      // Combine with video tracks if present
      const outputStream = destination.stream;
      const videoTracks = stream.getVideoTracks();

      for (const videoTrack of videoTracks) {
        outputStream.addTrack(videoTrack.clone());
      }

      this.logger?.log(LogLevels.DEBUG, "Audio filters applied", filters);
      return outputStream;
    } catch (error) {
      this.logger?.log(LogLevels.ERROR, "Failed to apply audio filters", error);
      return stream; // Return original stream on error
    }
  }
}

// Default export for Expo Router compatibility
export default MediaUtils;
