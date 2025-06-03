
TEMPORARY DOCUMENTATION!!!!!!!!!!!!!!!!!!!!!!!!!!

# WebRTC Modular Architecture

This document describes the new modular WebRTC system that has been restructured from the original large `webrtcMethods.js` class.

## Architecture Overview

The WebRTC system is now organized into several specialized modules:

### Core Components

#### `index.js` - Main WebRTC Manager
- **Purpose**: Single entry point and coordinator for all WebRTC functionality
- **Exports**: `WebRTCManager` class (singleton pattern)
- **Key Features**:
  - Unified API for all WebRTC operations
  - Component initialization and cross-referencing
  - Dependency injection pattern
  - Comprehensive cleanup methods

#### `core/GlobalState.js`
- **Purpose**: Centralized state management for all WebRTC data
- **Key Features**:
  - Single source of truth for all WebRTC state
  - Enhanced state tracking for new components
  - Event history and debugging support
  - Comprehensive cleanup methods

#### `core/PeerConnectionManager.js`
- **Purpose**: Manages RTCPeerConnection instances and negotiation
- **Key Features**:
  - Peer connection lifecycle management
  - Offer/answer negotiation
  - Connection state tracking

#### `core/StreamManager.js`
- **Purpose**: Manages local and remote media streams
- **Key Features**:
  - Local stream acquisition with platform-aware constraints
  - Remote stream management
  - Track addition/removal
  - Stream quality analysis

#### `core/ConnectionTracker.js`
- **Purpose**: Monitors connection health and provides diagnostics
- **Key Features**:
  - Real-time connection state monitoring
  - Performance metrics collection
  - Debug reporting

### Signaling Components

#### `signaling/SignalingManager.js`
- **Purpose**: Handles WebRTC signaling protocol
- **Key Features**:
  - Offer/answer handling
  - ICE candidate management
  - User join/leave events
  - Existing users setup

#### `signaling/ICEManager.js`
- **Purpose**: Specialized ICE candidate handling
- **Key Features**:
  - ICE candidate collection and exchange
  - Connection establishment optimization

### Feature Components

#### `features/VoiceActivityDetection.js`
- **Purpose**: Voice activity detection and speaking state management
- **Key Features**:
  - Local VAD using Web Audio API
  - Speaking state tracking per user
  - Configurable sensitivity thresholds
  - Signaling integration for remote VAD

#### `features/PinManager.js`
- **Purpose**: UI pin state management for user rectangles
- **Key Features**:
  - Pin/unpin user functionality
  - Pin history tracking
  - Event notifications
  - Validation and error handling

#### `features/HealthChecker.js`
- **Purpose**: Continuous connection health monitoring
- **Key Features**:
  - Periodic health checks
  - Connection state analysis
  - Failure detection
  - Recovery triggering

#### `features/RecoveryManager.js`
- **Purpose**: Automatic connection recovery
- **Key Features**:
  - Multiple recovery strategies (ICE restart, renegotiation, full reconnection)
  - Exponential backoff retry logic
  - Recovery attempt tracking
  - Strategy escalation

#### `features/ScreenShareManager.js`
- **Purpose**: Screen sharing functionality
- **Key Features**:
  - Screen capture initiation
  - Screen stream management
  - Cross-platform compatibility

### Utility Components

#### `utils/WebRTCUtils.js`
- **Purpose**: General WebRTC utility functions
- **Key Features**:
  - Browser compatibility checks
  - SDP parsing and analysis
  - Network information retrieval
  - Media device capabilities
  - Error handling utilities

#### `utils/MediaUtils.js`
- **Purpose**: Media-specific utility functions
- **Key Features**:
  - Optimal constraint generation
  - Stream quality analysis
  - Media conversion utilities
  - Audio filtering capabilities

#### `utils/EventReceiver.js`
- **Purpose**: External event handling and integration
- **Key Features**:
  - Event routing and processing
  - Middleware support
  - Socket event integration
  - Error handling

### Configuration

#### `config/constants.js`
- **Purpose**: WebRTC configuration constants
- **Key Features**:
  - ICE server configuration
  - Connection timeouts
  - Retry policies

#### `config/mediaConstraints.js`
- **Purpose**: Platform-specific media constraints
- **Key Features**:
  - Web/Android/iOS optimized constraints
  - Quality level presets
  - Network-adaptive settings

### Logging System

#### `logging/WebRTCLogger.js`
- **Purpose**: Centralized logging with importance levels
- **Key Features**:
  - Configurable log levels (CRITICAL, ERROR, WARNING, INFO, DEBUG, VERBOSE)
  - Conditional logging based on importance
  - Structured log output
  - Component-specific logging

#### `logging/LogLevels.js`
- **Purpose**: Log level constants and utilities

## Usage Examples

### Basic Initialization

```javascript
import WebRTCManager from './webrtc/index.js';

// Initialize with user and chat IDs
const webrtc = new WebRTCManager('user123', 'chat456', {
  onLocalStreamReady: (stream) => { /* handle stream */ },
  onPeerConnectionStateChange: (userId, state) => { /* handle state change */ },
  onParticipantLeft: (userId) => { /* handle participant leave */ },
  onStreamUpdate: (userId, stream) => { /* handle stream update */ }
});

// Start local media
await webrtc.startLocalStream(true); // audio only

// Connect to a participant
await webrtc.connectToNewParticipant({
  from: 'user789',
  handle: 'handle123'
});
```

### Voice Activity Detection

```javascript
// Check who's speaking
const speakingUsers = webrtc.getSpeakingUsers();

// Set speaking threshold
webrtc.setSpeakingThreshold(0.02);

// Listen for speaking events
webrtc.on('speaking-started', (data) => {
  console.log(`User ${data.userId} started speaking`);
});
```

### Pin Management

```javascript
// Pin a user
webrtc.pinUser('user789');

// Check pin status
const isPinned = webrtc.isUserPinned('user789');

// Get pin history
const history = webrtc.getPinHistory();
```

### Event Handling

```javascript
// Register custom event handlers
webrtc.on('connection-state-change', (data) => {
  console.log(`Connection to ${data.userId} changed to ${data.state}`);
});

// Process external socket events
webrtc.processSocketEvent({
  type: 'webrtc-offer',
  data: { userId: 'user789', offer: sdpOffer }
});
```

### System Diagnostics

```javascript
// Get comprehensive system status
const status = webrtc.getSystemStatus();

// Get connection statistics
const stats = webrtc.getConnectionStats();

// Get browser capabilities
const browserInfo = webrtc.getBrowserInfo();
const capabilities = await webrtc.getMediaCapabilities();
```

## Migration from Original System

The new modular system maintains API compatibility while providing enhanced functionality:

1. **Initialization**: Use `new WebRTCManager(myId, chatId, callbacks)` instead of setting properties individually
2. **Event Handling**: Use the new event system for better organization
3. **Health Monitoring**: Automatic connection health checking and recovery
4. **Enhanced Features**: Voice activity detection, pin management, and improved logging

## Benefits

1. **Modularity**: Each component has a single responsibility
2. **Testability**: Components can be tested in isolation
3. **Maintainability**: Easier to understand and modify individual components
4. **Extensibility**: Easy to add new features without affecting existing code
5. **Performance**: Better resource management and cleanup
6. **Debugging**: Enhanced logging and diagnostic capabilities
7. **Reliability**: Automatic health monitoring and recovery mechanisms

## Component Dependencies

```
WebRTCManager (main)
├── GlobalState (state management)
├── PeerConnectionManager (peer connections)
├── StreamManager (media streams)
├── ConnectionTracker (connection monitoring)
├── SignalingManager (WebRTC signaling)
├── VoiceActivityDetection (VAD functionality)
├── PinManager (UI pin management)
├── HealthChecker (health monitoring)
├── RecoveryManager (connection recovery)
├── ScreenShareManager (screen sharing)
├── EventReceiver (event handling)
├── WebRTCUtils (general utilities)
├── MediaUtils (media utilities)
└── WebRTCLogger (logging system)
```

All components are loosely coupled through dependency injection, making the system flexible and maintainable.
