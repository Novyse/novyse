/// The `window.AppSDK` bootstrap, injected into every plugin document before
/// its own scripts run.
///
/// The plugin talks to the host through one JSON request/response channel and
/// receives events through `window.__appSdkEmit`. Two transports, chosen at
/// runtime so the same bundle runs unchanged everywhere:
///
/// - every engine that has one: the `window.appSdk` JavaScript channel the host
///   registers under that name;
/// - Windows: the WebView2 message pipe, `window.chrome.webview.postMessage`.
///
/// Neither has a promise to settle, so both are answered by
/// `window.__appSdkReply`.
///
/// The SDK is a thin transport: every decision (permissions, limits, the
/// snapshot) belongs to the host, so nothing here can be trusted by a plugin
/// to be authoritative.
const String appSdkSource = r'''
(function () {
  if (window.AppSDK) return;

  var pending = new Map();
  var nextId = 1;
  var handlers = { participants: [], ended: [], action: [], stream: [], playerClosed: [], playerIntent: [], theme: [], controls: [] };
  var stateHandlers = new Map();

  var statePending = new Map();
  var stateInitSeq = null;
  var STATE_PENDING_MAX = 64;

  function sdkError(code, message) {
    var error = new Error(message || code);
    error.code = code;
    return error;
  }

  function settle(raw) {
    if (raw === null || raw === undefined) return;

    var reply = raw;
    if (typeof raw === 'string') {
      try {
        reply = JSON.parse(raw);
      } catch (error) {
        return;
      }
    }

    if (!reply || typeof reply.id !== 'number') return;

    var entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);

    if (reply.ok) {
      if (entry.method === 'init' && reply.result && reply.result.state) {
        stateInitSeq = Number(reply.result.state.seq) || 0;
        flushStates();
      }

      entry.resolve(reply.result === undefined ? null : reply.result);
      return;
    }

    var failure = reply.error || {};
    entry.reject(sdkError(failure.code || 'E_INTERNAL', failure.message));
  }

  var TRANSPORT_WAIT_MS = 4000;
  var TRANSPORT_POLL_MS = 50;

  function transmit(message) {
    // The channel the host registered, with the same name on every engine, so
    // a plugin never learns which platform it is running on.
    var channel = window.appSdk;
    if (channel && channel.postMessage) {
      channel.postMessage(message);
      return true;
    }

    // Windows: WebView2 hands the page one message pipe, read by the host.
    var webview = window.chrome && window.chrome.webview;
    if (webview && webview.postMessage) {
      webview.postMessage(message);
      return true;
    }

    return false;
  }

  function request(method, params) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending.set(id, { resolve: resolve, reject: reject, method: method });

      var message = JSON.stringify({
        id: id,
        method: method,
        params: params === undefined ? null : params
      });

      var waited = 0;

      function send() {
        if (transmit(message)) return;

        waited += TRANSPORT_POLL_MS;

        if (waited >= TRANSPORT_WAIT_MS) {
          pending.delete(id);
          reject(sdkError('E_INTERNAL', 'no host transport'));
          return;
        }

        setTimeout(send, TRANSPORT_POLL_MS);
      }

      send();
    });
  }

  function subscribe(bucket, callback) {
    handlers[bucket].push(callback);
    return function () {
      var index = handlers[bucket].indexOf(callback);
      if (index >= 0) handlers[bucket].splice(index, 1);
    };
  }

  function dispatch(bucket, callback) {
    try {
      callback();
    } catch (error) {
      if (window.console && window.console.error) window.console.error(error);
    }
  }

  function emit(event, payload) {
    if (event === 'activity:theme') {
      var theme = payload && payload.theme === 'light' ? 'light' : 'dark';
      var colors = payload && Array.isArray(payload.themeColors) ? payload.themeColors : [];
      handlers.theme.slice().forEach(function (callback) {
        dispatch('theme', function () { callback({ theme: theme, themeColors: colors }); });
      });
      return;
    }

    if (event === 'activity:controls') {
      var controls = payload || {};
      handlers.controls.slice().forEach(function (callback) {
        dispatch('controls', function () {
          callback({
            pinned: !!controls.pinned,
            fullscreen: !!controls.fullscreen,
            closable: !!controls.closable
          });
        });
      });
      return;
    }

    if (event === 'activity:participants') {
      handlers.participants.slice().forEach(function (callback) {
        dispatch('participants', function () { callback(payload || []); });
      });
      return;
    }

    if (event === 'activity:ended') {
      var reason = payload && payload.reason ? payload.reason : 'stopped';
      handlers.ended.slice().forEach(function (callback) {
        dispatch('ended', function () { callback(reason); });
      });
      return;
    }

    if (event === 'activity:action') {
      handlers.action.slice().forEach(function (callback) {
        dispatch('action', function () { callback(payload || {}); });
      });
      return;
    }

    if (event === 'activity:stream') {
      var bytes = fromBase64(payload && payload.data ? payload.data : '');
      var sender = payload && payload.sender ? payload.sender : '';
      handlers.stream.slice().forEach(function (callback) {
        dispatch('stream', function () { callback(sender, bytes); });
      });
      return;
    }

    if (event === 'activity:player') {
      if (payload && payload.state === 'closed') {
        handlers.playerClosed.slice().forEach(function (callback) {
          dispatch('playerClosed', function () { callback(); });
        });
      }

      if (payload && payload.state === 'intent') {
        var playing = !!payload.playing;
        var position = Number(payload.position) || 0;
        handlers.playerIntent.slice().forEach(function (callback) {
          dispatch('playerIntent', function () { callback(playing, position); });
        });
      }
      return;
    }

    if (event === 'activity:state') {
      var type = payload && payload.type ? payload.type : '';
      var waiting =
        (stateHandlers.get(type) || []).length +
        (type === '*' ? 0 : (stateHandlers.get('*') || []).length);

      if (waiting === 0) {
        var queued = statePending.get(type) || [];
        if (queued.length >= STATE_PENDING_MAX) queued.shift();
        queued.push(payload || {});
        statePending.set(type, queued);
        return;
      }

      deliverState(type, [payload || {}]);
    }
  }

  function deliverState(type, events) {
    var callbacks = (stateHandlers.get(type) || []).slice();
    if (type !== '*') {
      callbacks = callbacks.concat((stateHandlers.get('*') || []).slice());
    }

    events.forEach(function (mutation) {
      callbacks.forEach(function (callback) {
        dispatch('state', function () { callback(mutation); });
      });
    });
  }

  // Hands the queued mutations to the subscribers that exist now, in order.
  function flushStates() {
    if (stateInitSeq === null) return;

    statePending.forEach(function (events, type) {
      var listening =
        (stateHandlers.get(type) || []).length > 0 ||
        (type !== '*' && (stateHandlers.get('*') || []).length > 0);

      if (!listening) return;

      statePending.delete(type);

      var fresh = events.filter(function (mutation) {
        return Number(mutation && mutation.seq) > stateInitSeq;
      });

      if (fresh.length > 0) deliverState(type, fresh);
    });
  }

  window.__appSdkEmit = function (raw) {
    var envelope = raw;
    if (typeof raw === 'string') {
      try {
        envelope = JSON.parse(raw);
      } catch (error) {
        return;
      }
    }

    if (!envelope || !envelope.event) return;
    emit(envelope.event, envelope.payload);
  };

  window.__appSdkReply = settle;

  function toBase64(bytes) {
    var view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    var binary = '';
    for (var index = 0; index < view.length; index++) {
      binary += String.fromCharCode(view[index]);
    }
    return window.btoa(binary);
  }

  function fromBase64(encoded) {
    var binary = window.atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  window.AppSDK = {
    init: function () {
      if (!window.AppSDK._init) window.AppSDK._init = request('init', null);
      return window.AppSDK._init;
    },

    onParticipants: function (callback) {
      return subscribe('participants', callback);
    },

    onEnded: function (callback) {
      return subscribe('ended', callback);
    },

    onTheme: function (callback) {
      return subscribe('theme', callback);
    },

    state: {
      send: function (type, data) {
        return request('state.send', {
          type: type,
          data: data === undefined ? null : data
        });
      },
      on: function (type, callback) {
        var key = type || '*';
        if (!stateHandlers.has(key)) stateHandlers.set(key, []);
        var bucket = stateHandlers.get(key);
        bucket.push(callback);

        flushStates();

        return function () {
          var index = bucket.indexOf(callback);
          if (index >= 0) bucket.splice(index, 1);
        };
      }
    },

    action: {
      send: function (type, data) {
        return request('action.send', {
          type: type,
          data: data === undefined ? null : data
        }).then(function () { return undefined; });
      },
      on: function (callback) {
        return subscribe('action', callback);
      }
    },

    stream: {
      send: function (bytes) {
        request('stream.send', { data: toBase64(bytes) }).catch(function () {});
      },
      on: function (callback) {
        return subscribe('stream', callback);
      }
    },

    users: {
      get: function (uuid) {
        return request('users.get', { uuid: uuid });
      }
    },

    ui: {
      requestFullscreen: function () {
        request('ui.fullscreen', null).catch(function () {});
      },
      exitFullscreen: function () {
        request('ui.restore', null).catch(function () {});
      },
      close: function () {
        request('ui.close', null).catch(function () {});
      },
      pin: function () {
        request('ui.pin', null).catch(function () {});
      },
      unpin: function () {
        request('ui.unpin', null).catch(function () {});
      },
      openMenu: function (anchor) {
        request('ui.menu', {
          anchor: anchor === undefined ? null : anchor
        }).catch(function () {});
      },
      onControls: function (callback) {
        return subscribe('controls', callback);
      }
    },

    player: {
      open: function (url) {
        return request('player.open', { url: url }).then(function () { return undefined; });
      },
      close: function () {
        return request('player.close', null).then(function () { return undefined; });
      },
      onClosed: function (callback) {
        return subscribe('playerClosed', callback);
      },
      onIntent: function (callback) {
        return subscribe('playerIntent', callback);
      },
      sync: function (playing, position) {
        return request('player.sync', {
          playing: !!playing,
          position: position
        }).then(function () { return undefined; });
      }
    },

    storage: {
      get: function (key) {
        return request('storage.get', { key: key });
      },
      set: function (key, value) {
        return request('storage.set', { key: key, value: value });
      },
      delete: function (key) {
        return request('storage.delete', { key: key });
      }
    },

    file: {
      upload: function (name, mimeType, size) {
        return request('file.upload', { name: name, mimeType: mimeType, size: size });
      },
      confirm: function (fileUUID) {
        return request('file.confirm', { fileUUID: fileUUID }).then(function () { return undefined; });
      },
      download: function (fileUUID) {
        return request('file.download', { fileUUID: fileUUID });
      },
      remove: function (fileUUID) {
        return request('file.remove', { fileUUID: fileUUID }).then(function () { return undefined; });
      }
    },

    log: function (level) {
      var args = Array.prototype.slice.call(arguments, 1);
      request('log', { level: level, args: args }).catch(function () {});
    }
  };
})();
''';

/// Content Security Policy injected into every plugin document.
///
/// Every frame is refused unless the plugin declared its origin in
/// `manifest.json`: [frameSources] is the `frame-src` list built from that
/// declaration, `'none'` when the plugin embeds nothing.
///
/// [allowEval] is on only for the web build: the age gate of the embedded
/// player compiles a function at runtime.
String pluginContentSecurityPolicy(
  String frameSources, {
  bool allowEval = false,
}) =>
    "default-src 'none'; "
    "script-src 'unsafe-inline'${allowEval ? " 'unsafe-eval'" : ''} https:; "
    "style-src 'unsafe-inline' https:; "
    "img-src https: data: blob:; "
    "media-src https: blob:; "
    "font-src https: data:; "
    "connect-src https:; "
    "frame-src $frameSources";
