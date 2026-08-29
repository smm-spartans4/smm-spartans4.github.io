/* ============================================================================
   FF.playback - the clock.

   A tiny timeline that knows the current second of a play and can run forward
   in real time. Everything visual is derived from that one number, so playing,
   pausing, scrubbing and stepping all go through the same path and can never
   disagree about where the play is.
   ========================================================================== */
(function (FF) {
  'use strict';

  function create(opts) {
    opts = opts || {};
    var duration = opts.duration || 5;
    var speed = 1;
    var t = 0;
    var playing = false;
    var raf = null;
    var last = 0;

    function tick() { if (opts.onTick) opts.onTick(t); }
    function state() { if (opts.onState) opts.onState(playing, t); }

    function frame(now) {
      if (!playing) return;
      var dt = (now - last) / 1000;
      last = now;
      t += dt * speed;
      if (t >= duration) {
        t = duration;
        playing = false;
        tick();
        state();
        return;
      }
      tick();
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (playing) return;
      if (t >= duration - 0.001) t = 0;   // replay from the snap
      playing = true;
      last = performance.now();
      state();
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      if (!playing) return;
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      state();
    }

    function setTime(v) {
      t = Math.max(0, Math.min(duration, v));
      tick();
    }

    return {
      play: play,
      pause: pause,
      toggle: function () { playing ? pause() : play(); },
      restart: function () { pause(); setTime(0); },
      step: function (delta) { pause(); setTime(t + delta); },
      setTime: setTime,
      getTime: function () { return t; },
      setSpeed: function (v) { speed = v; },
      getSpeed: function () { return speed; },
      setDuration: function (v) { duration = v; if (t > v) setTime(v); },
      getDuration: function () { return duration; },
      isPlaying: function () { return playing; },
      destroy: function () { if (raf) cancelAnimationFrame(raf); playing = false; }
    };
  }

  FF.playback = { create: create };
})(window.FF = window.FF || {});
