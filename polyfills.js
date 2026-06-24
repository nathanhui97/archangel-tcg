// Polyfills injected at the very top of every bundle via metro.config.js.
// Plain ES5 syntax only — runs before any JS engine setup.
//
// The JS engine inside Expo Go (older Hermes/JSC) is missing some Web APIs
// that RN 0.81+ and certain libraries expect. We stub them out minimally —
// just enough so the existence checks pass and `new X()` doesn't throw.

;(function () {
  var g = typeof globalThis === 'object' ? globalThis
        : typeof global === 'object' ? global
        : typeof window === 'object' ? window
        : this

  if (!g) return

  // ─── DOMException ─────────────────────────────────────────────────
  if (typeof g.DOMException === 'undefined') {
    g.DOMException = Error
  }

  // ─── Performance API ──────────────────────────────────────────────
  function PerformanceEntry() {}
  PerformanceEntry.prototype.name = ''
  PerformanceEntry.prototype.entryType = ''
  PerformanceEntry.prototype.startTime = 0
  PerformanceEntry.prototype.duration = 0

  function PerformanceMark() { PerformanceEntry.call(this) }
  PerformanceMark.prototype = Object.create(PerformanceEntry.prototype)

  function PerformanceMeasure() { PerformanceEntry.call(this) }
  PerformanceMeasure.prototype = Object.create(PerformanceEntry.prototype)

  function PerformanceObserver(callback) {
    this._cb = callback
  }
  PerformanceObserver.prototype.observe = function () {}
  PerformanceObserver.prototype.disconnect = function () {}
  PerformanceObserver.prototype.takeRecords = function () { return [] }
  PerformanceObserver.supportedEntryTypes = []

  if (typeof g.PerformanceEntry === 'undefined') g.PerformanceEntry = PerformanceEntry
  if (typeof g.PerformanceMark === 'undefined') g.PerformanceMark = PerformanceMark
  if (typeof g.PerformanceMeasure === 'undefined') g.PerformanceMeasure = PerformanceMeasure
  if (typeof g.PerformanceObserver === 'undefined') g.PerformanceObserver = PerformanceObserver

  // ─── queueMicrotask ──────────────────────────────────────────────
  if (typeof g.queueMicrotask === 'undefined') {
    g.queueMicrotask = function (cb) {
      Promise.resolve().then(cb).catch(function (e) {
        setTimeout(function () { throw e }, 0)
      })
    }
  }

  // ─── structuredClone ─────────────────────────────────────────────
  if (typeof g.structuredClone === 'undefined') {
    g.structuredClone = function (v) { return JSON.parse(JSON.stringify(v)) }
  }
})()
