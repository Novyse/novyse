/**
 * PinManager - Manages UI pin state for user rectangles
 * Handles pinning/unpinning of user video feeds and screen shares
 */
export class PinManager {
  constructor(globalState, logger) {
    this.logger = logger;
    this.globalState = globalState;

    // Currently pinned rectangle ID (can be user ID or screen share ID)
    this.pinnedRectangleId = null;

    // Pin history for quick toggling
    this.pinHistory = [];
    this.MAX_PIN_HISTORY = 5;

    this.logger.info("PinManager", "Pin manager initialized");
  }

  /**
   * Set the pinned rectangle ID (can be user ID or screen share ID)
   * @param {string|null} rectangleId - The rectangle ID to pin, or null to unpin
   * @returns {boolean} True if pinning was successful
   */
  setPinnedUser(rectangleId) {
    const previousPin = this.pinnedRectangleId;

    if (rectangleId === this.pinnedRectangleId) {
      // Already pinned, no change needed
      return true;
    }

    this.pinnedRectangleId = rectangleId;

    // Add to history if we're pinning something new
    if (rectangleId && rectangleId !== previousPin) {
      this._addToPinHistory(rectangleId);
    }

    // Update global state
    this.globalState.setPinnedUser(rectangleId);

    this.logger.debug(
      "PinManager",
      `Pin changed from ${previousPin || "none"} to ${rectangleId || "none"}`
    );

    return true;
  }

  unpinUser() {
    const previousPin = this.pinnedRectangleId;
    this.setPinnedUser(null);

    this.logger.debug("PinManager", `Unpinned rectangle ${previousPin}`);

    return previousPin;
  }

  /**
   * Get the currently pinned rectangle ID
   * @returns {string|null} The pinned rectangle ID or null if no rectangle is pinned
   */
  getPinnedUser() {
    return this.pinnedRectangleId;
  }

  /**
   * Toggle pin state for a rectangle
   * @param {string} rectangleId - The rectangle ID to toggle pin for (user ID or screen share ID)
   * @returns {boolean} True if now pinned, false if unpinned
   */
  togglePinById(rectangleId) {
    if (!rectangleId) {
      this.logger.warn(
        "PinManager",
        "Cannot toggle pin for empty rectangle ID"
      );
      return false;
    }

    this.logger.debug(
      "PinManager",
      `Toggling pin for rectangle ${rectangleId}`
    );

    const isCurrentlyPinned = this.pinnedRectangleId === rectangleId;

    if (isCurrentlyPinned) {
      // Unpin current rectangle
      this.setPinnedUser(null);
      return true;
    } else {
      // Pin this rectangle
      this.setPinnedUser(rectangleId);
      return true;
    }
  }

  /**
   * Clear pin if the specified rectangle ID matches the currently pinned one
   * @param {string} rectangleId - The rectangle ID to check
   * @returns {boolean} True if pin was cleared
   */
  clearPinIfId(rectangleId) {
    if (this.pinnedRectangleId === rectangleId) {
      this.setPinnedUser(null);
      this.logger.debug(
        "PinManager",
        `Cleared pin for rectangle ${rectangleId}`
      );
      return true;
    }
    return false;
  }

  /**
   * Check if a specific rectangle is pinned
   * @param {string} rectangleId - Rectangle ID to check
   * @returns {boolean} True if the rectangle is pinned
   */
  isRectanglePinned(rectangleId) {
    return this.pinnedRectangleId === rectangleId;
  }

  /**
   * Get pin history
   * @returns {Array<string>} Array of recently pinned rectangle IDs
   */
  getPinHistory() {
    return [...this.pinHistory];
  }

  /**
   * Pin the most recently pinned rectangle (if available)
   * @returns {boolean} True if a previous pin was restored
   */
  restoreLastPin() {
    if (this.pinHistory.length === 0) {
      return false;
    }

    // Find the most recent pin that's not currently pinned
    for (const rectangleId of this.pinHistory) {
      if (rectangleId !== this.pinnedRectangleId) {
        this.setPinnedUser(rectangleId);
        return true;
      }
    }

    return false;
  }

  /**
   * Clear all pin state
   */
  clearAllPins() {
    const wasPinned = this.pinnedRectangleId !== null;
    this.pinnedRectangleId = null;
    this.pinHistory = [];

    this.globalState.setPinnedUser(null);

    this.logger.debug("PinManager", "All pins cleared");
  }

  /**
   * Validate that currently pinned rectangle still exists
   * @param {Array<string>} availableRectangles - Array of available rectangle IDs
   * @returns {boolean} True if current pin is valid
   */
  validateCurrentPin(availableRectangles) {
    if (!this.pinnedRectangleId) {
      return true; // No pin is always valid
    }

    const isValid = availableRectangles.includes(this.pinnedRectangleId);

    if (!isValid) {
      this.logger.warn(
        "PinManager",
        `Currently pinned rectangle ${this.pinnedRectangleId} is no longer available`
      );
      this.setPinnedUser(null);
    }

    return isValid;
  }

  /**
   * Get pin statistics
   * @returns {Object} Pin statistics
   */
  getPinStatistics() {
    return {
      currentPin: this.pinnedRectangleId,
      hasPinnedRectangle: this.pinnedRectangleId !== null,
      pinHistoryCount: this.pinHistory.length,
      pinHistory: this.getPinHistory(),
    };
  }

  /**
   * Add rectangle to pin history
   * @param {string} rectangleId - Rectangle ID to add
   * @private
   */
  _addToPinHistory(rectangleId) {
    // Remove if already in history
    const index = this.pinHistory.indexOf(rectangleId);
    if (index > -1) {
      this.pinHistory.splice(index, 1);
    }

    // Add to front of history
    this.pinHistory.unshift(rectangleId);

    // Limit history size
    if (this.pinHistory.length > this.MAX_PIN_HISTORY) {
      this.pinHistory = this.pinHistory.slice(0, this.MAX_PIN_HISTORY);
    }
  }

  /**
   * Reset pin manager state
   */
  reset() {
    this.clearAllPins();
    this.logger.info("PinManager", "Pin manager reset");
  }

  /**
   * Destroy pin manager
   */
  destroy() {
    this.reset();
    this.logger.info("PinManager", "Pin manager destroyed");
  }
}

export default PinManager;
