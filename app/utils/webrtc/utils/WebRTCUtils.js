/**
 * WebRTC Utility Functions
 * Provides common utility functions for WebRTC operations
 */

import { LogLevels } from '../logging/LogLevels.js';

export class WebRTCUtils {
    constructor(logger) {
        this.logger = logger;
    }

    /**
     * Check if WebRTC is supported in current environment
     * @returns {boolean} True if WebRTC is supported
     */
    isWebRTCSupported() {
        return !!(
            (typeof RTCPeerConnection !== 'undefined' || 
             typeof webkitRTCPeerConnection !== 'undefined' || 
             typeof mozRTCPeerConnection !== 'undefined') &&
            (typeof getUserMedia !== 'undefined' || 
             (navigator.mediaDevices && navigator.mediaDevices.getUserMedia))
        );
    }

    /**
     * Get WebRTC browser information
     * @returns {object} Browser compatibility info
     */
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
        const isFirefox = /Firefox/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
        const isEdge = /Edge/.test(userAgent);

        return {
            isChrome,
            isFirefox,
            isSafari,
            isEdge,
            userAgent,
            supportsUnifiedPlan: this.supportsUnifiedPlan(),
            supportsMidExtension: this.supportsMidExtension()
        };
    }

    /**
     * Check if browser supports Unified Plan
     * @returns {boolean} True if Unified Plan is supported
     */
    supportsUnifiedPlan() {
        try {
            const pc = new RTCPeerConnection();
            const config = pc.getConfiguration();
            pc.close();
            return config.sdpSemantics !== 'plan-b';
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if browser supports MID extension
     * @returns {boolean} True if MID extension is supported
     */
    supportsMidExtension() {
        try {
            const pc = new RTCPeerConnection();
            const transceivers = pc.getTransceivers();
            pc.close();
            return transceivers.length >= 0; // Basic check
        } catch (e) {
            return false;
        }
    }

    /**
     * Parse SDP for debugging
     * @param {string} sdp - SDP string
     * @returns {object} Parsed SDP information
     */
    parseSDP(sdp) {
        const lines = sdp.split('\n');
        const parsed = {
            version: null,
            origin: null,
            sessionName: null,
            mediaDescriptions: [],
            attributes: []
        };

        let currentMedia = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('v=')) {
                parsed.version = trimmed.substring(2);
            } else if (trimmed.startsWith('o=')) {
                parsed.origin = trimmed.substring(2);
            } else if (trimmed.startsWith('s=')) {
                parsed.sessionName = trimmed.substring(2);
            } else if (trimmed.startsWith('m=')) {
                currentMedia = {
                    type: trimmed.substring(2),
                    attributes: [],
                    candidates: []
                };
                parsed.mediaDescriptions.push(currentMedia);
            } else if (trimmed.startsWith('a=')) {
                const attribute = trimmed.substring(2);
                if (currentMedia) {
                    currentMedia.attributes.push(attribute);
                    if (attribute.startsWith('candidate:')) {
                        currentMedia.candidates.push(attribute);
                    }
                } else {
                    parsed.attributes.push(attribute);
                }
            }
        }

        return parsed;
    }

    /**
     * Sanitize user input for WebRTC operations
     * @param {string} input - User input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        return input.replace(/[<>\"'&]/g, '').trim().substring(0, 255);
    }

    /**
     * Create a deep copy of an object
     * @param {object} obj - Object to clone
     * @returns {object} Deep cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Number of bytes
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted size string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Get network type information
     * @returns {object} Network information
     */
    getNetworkInfo() {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (!connection) {
            return {
                type: 'unknown',
                effectiveType: 'unknown',
                downlink: null,
                rtt: null
            };
        }

        return {
            type: connection.type || 'unknown',
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink || null,
            rtt: connection.rtt || null,
            saveData: connection.saveData || false
        };
    }

    /**
     * Validate ICE candidate
     * @param {object} candidate - ICE candidate object
     * @returns {boolean} True if candidate is valid
     */
    validateICECandidate(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }

        return !!(
            candidate.candidate &&
            typeof candidate.candidate === 'string' &&
            candidate.sdpMLineIndex !== undefined &&
            candidate.sdpMid !== undefined
        );
    }

    /**
     * Get media device capabilities
     * @returns {Promise<object>} Device capabilities
     */
    async getMediaCapabilities() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const capabilities = {
                audioInputs: devices.filter(d => d.kind === 'audioinput').length,
                audioOutputs: devices.filter(d => d.kind === 'audiooutput').length,
                videoInputs: devices.filter(d => d.kind === 'videoinput').length,
                supportsDisplayCapture: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
                supportsAudioOutput: !!(HTMLMediaElement.prototype.setSinkId)
            };

            this.logger?.log(LogLevels.DEBUG, 'Media capabilities retrieved', capabilities);
            return capabilities;
        } catch (error) {
            this.logger?.log(LogLevels.ERROR, 'Failed to get media capabilities', error);
            return {
                audioInputs: 0,
                audioOutputs: 0,
                videoInputs: 0,
                supportsDisplayCapture: false,
                supportsAudioOutput: false
            };
        }
    }

    /**
     * Create error object with additional context
     * @param {string} message - Error message
     * @param {string} code - Error code
     * @param {object} context - Additional context
     * @returns {Error} Enhanced error object
     */
    createError(message, code = 'WEBRTC_ERROR', context = {}) {
        const error = new Error(message);
        error.code = code;
        error.context = context;
        error.timestamp = new Date().toISOString();
        return error;
    }

    /**
     * Get WebRTC libraries for cross-platform compatibility
     * @returns {object} WebRTC API objects
     */
    getWebRTCLib() {
        try {
            // Import compatibility module
            const Compatibility = require('../utils/compatibility.js');
            return Compatibility.getWebRTCLib();
        } catch (error) {
            this.logger?.log(LogLevels.ERROR, 'Failed to get WebRTC lib', error);
            
            // Fallback to native browser APIs
            return {
                RTCPeerConnection: window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection,
                RTCIceCandidate: window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate,
                RTCSessionDescription: window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription,
                mediaDevices: navigator.mediaDevices,
                MediaStream: window.MediaStream || window.webkitMediaStream
            };
        }
    }
}

// Default export for Expo Router compatibility
export default WebRTCUtils;
