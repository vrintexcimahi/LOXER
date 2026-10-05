/**
 * LOXER Universal Native Bridge Web SDK v2.0
 * Provides seamless cross-platform communication between the LOXER Web Application
 * and the native Android (Kotlin) & iOS (Swift) container shells.
 *
 * Automatically falls back to standard browser APIs when running outside the native shell.
 */
(function (global) {
  'use strict';

  var callbackCounter = 0;
  var callbackMap = {};
  var eventListeners = {};

  var isAndroid = typeof window !== 'undefined' && (
    (window.AndroidBridge !== undefined) ||
    (window.LoxerNativeAndroid !== undefined) ||
    (window.LoxerNative && typeof window.LoxerNative._invokeNative === 'function')
  );

  var isIOS = typeof window !== 'undefined' &&
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.loxerNative !== undefined;

  function generateCallbackId() {
    callbackCounter += 1;
    return 'loxer_cb_' + Date.now() + '_' + callbackCounter;
  }

  function invokeNative(action, payload) {
    payload = payload || {};
    return new Promise(function (resolve, reject) {
      var callbackId = generateCallbackId();
      callbackMap[callbackId] = { resolve: resolve, reject: reject };
      payload._callbackId = callbackId;

      try {
        if (isAndroid) {
          var jsonStr = JSON.stringify(payload);
          if (window.LoxerNativeAndroid && typeof window.LoxerNativeAndroid.dispatch === 'function') {
            window.LoxerNativeAndroid.dispatch(action, jsonStr);
          } else if (window.LoxerNative && typeof window.LoxerNative._invokeNative === 'function') {
            window.LoxerNative._invokeNative(action, jsonStr);
          } else if (window.AndroidBridge && typeof window.AndroidBridge.postMessage === 'function') {
            window.AndroidBridge.postMessage(JSON.stringify({ action: action, payload: payload }));
          } else {
            fallbackAction(action, payload, resolve, reject);
          }
        } else if (isIOS) {
          window.webkit.messageHandlers.loxerNative.postMessage({
            action: action,
            payload: payload
          });
        } else {
          fallbackAction(action, payload, resolve, reject);
        }
      } catch (err) {
        delete callbackMap[callbackId];
        fallbackAction(action, payload, resolve, reject);
      }
    });
  }

  function fallbackAction(action, payload, resolve, reject) {
    switch (action) {
      case 'getPlatform':
        resolve({ platform: 'web', isNative: false });
        break;
      case 'getAppVersion':
        resolve({ version: 'web-browser', versionCode: 0 });
        break;
      case 'getDeviceInfo':
        resolve({
          model: navigator.userAgent,
          platform: 'web',
          isNative: false,
          screen: { width: window.innerWidth, height: window.innerHeight }
        });
        break;
      case 'getPushToken':
        resolve({ token: null, error: 'Push token only available in native app' });
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: payload.title || document.title,
            text: payload.text || '',
            url: payload.url || window.location.href
          }).then(function () { resolve({ success: true }); })
            .catch(function (e) { resolve({ success: false, error: e.message }); });
        } else if (payload.url || payload.text) {
          copyToClipboard(payload.url || payload.text);
          resolve({ success: true, copied: true });
        } else {
          resolve({ success: false, error: 'Web Share not supported' });
        }
        break;
      case 'copyToClipboard':
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload.text || '')
            .then(function () { resolve({ success: true }); })
            .catch(function () { resolve({ success: false }); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = payload.text || '';
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          resolve({ success: true });
        }
        break;
      case 'openWhatsApp':
        var cleanPhone = (payload.phone || '').replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        var waUrl = 'https://wa.me/' + cleanPhone + (payload.text ? '?text=' + encodeURIComponent(payload.text) : '');
        window.open(waUrl, '_blank');
        resolve({ success: true });
        break;
      case 'openExternalBrowser':
        if (payload.url) {
          window.open(payload.url, '_blank');
          resolve({ success: true });
        } else {
          reject(new Error('URL is required'));
        }
        break;
      case 'requestLocation':
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              });
            },
            function (err) { reject(err); },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        } else {
          reject(new Error('Geolocation not available'));
        }
        break;
      case 'vibrate':
        if (navigator.vibrate) {
          navigator.vibrate(payload.durationMs || 50);
          resolve({ success: true });
        } else {
          resolve({ success: false, notSupported: true });
        }
        break;
      case 'getSafeArea':
        resolve({ top: 0, bottom: 0, left: 0, right: 0 });
        break;
      default:
        resolve({ success: false, fallback: true, action: action });
        break;
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
  }

  var SDK = {
    isNative: function () {
      return isAndroid || isIOS;
    },

    getPlatform: function () {
      if (isAndroid) return 'android';
      if (isIOS) return 'ios';
      return 'web';
    },

    getAppVersion: function () {
      return invokeNative('getAppVersion');
    },

    getDeviceInfo: function () {
      return invokeNative('getDeviceInfo');
    },

    getPushToken: function () {
      return invokeNative('getPushToken');
    },

    requestLocation: function (options) {
      return invokeNative('requestLocation', options || {});
    },

    openCamera: function (options) {
      return invokeNative('openCamera', options || {});
    },

    openGallery: function (options) {
      return invokeNative('openGallery', options || {});
    },

    pickFile: function (options) {
      return invokeNative('pickFile', options || { mimeTypes: ['*/*'] });
    },

    downloadFile: function (options) {
      return invokeNative('downloadFile', options || {});
    },

    share: function (options) {
      return invokeNative('share', options || {});
    },

    openWhatsApp: function (phone, text) {
      return invokeNative('openWhatsApp', { phone: phone, text: text });
    },

    openExternalBrowser: function (url) {
      return invokeNative('openExternalBrowser', { url: url });
    },

    openMaps: function (options) {
      return invokeNative('openMaps', options || {});
    },

    scanQR: function () {
      return invokeNative('scanQR', {});
    },

    biometricAuth: function (options) {
      return invokeNative('biometricAuth', options || {
        title: 'Verifikasi Biometrik',
        subtitle: 'Konfirmasi identitas Anda'
      });
    },

    vibrate: function (durationMs) {
      return invokeNative('vibrate', { durationMs: durationMs || 50 });
    },

    setStatusBar: function (colorHex, darkIcons) {
      return invokeNative('setStatusBar', { color: colorHex, darkIcons: !!darkIcons });
    },

    setNavigationBar: function (colorHex, darkIcons) {
      return invokeNative('setNavigationBar', { color: colorHex, darkIcons: !!darkIcons });
    },

    copyToClipboard: function (text) {
      return invokeNative('copyToClipboard', { text: text });
    },

    getSafeArea: function () {
      return invokeNative('getSafeArea', {});
    },

    notifyWebReady: function (version) {
      return invokeNative('notifyWebReady', { version: version || 'latest' });
    },

    setSafeToReload: function (isSafe) {
      window.__LOXER_SAFE_TO_RELOAD__ = Boolean(isSafe);
      return invokeNative('setSafeToReload', { isSafe: Boolean(isSafe) });
    },

    on: function (eventName, handler) {
      if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
      }
      eventListeners[eventName].push(handler);
    },

    off: function (eventName, handler) {
      if (!eventListeners[eventName]) return;
      eventListeners[eventName] = eventListeners[eventName].filter(function (h) {
        return h !== handler;
      });
    },

    _emitNativeEvent: function (eventName, eventData) {
      var handlers = eventListeners[eventName] || [];
      for (var i = 0; i < handlers.length; i++) {
        try {
          handlers[i](eventData);
        } catch (err) {
          console.error('[LoxerNative] Event listener error:', err);
        }
      }
    },

    _handleNativeCallback: function (callbackId, isSuccess, resultData, errorMessage) {
      var cb = callbackMap[callbackId];
      if (cb) {
        delete callbackMap[callbackId];
        if (isSuccess) {
          cb.resolve(resultData);
        } else {
          cb.reject(new Error(errorMessage || 'Native action failed'));
        }
      }
    }
  };

  // Expose globally
  global.LoxerNative = SDK;
  global.LOXER_NATIVE = SDK;

  // Auto-detect & set window flags for web discovery
  if (SDK.isNative()) {
    global.isNativeApp = true;
    global.isLoxerApp = true;
  }
})(typeof window !== 'undefined' ? window : this);
