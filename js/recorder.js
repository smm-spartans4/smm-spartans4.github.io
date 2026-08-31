/* ============================================================================
   FF.recorder - turn a play into an MP4 you can keep on a phone or iPad.

   How it works: step through the play a frame at a time, draw each instant to
   a canvas, hand it to the browser's H.264 encoder, and wrap the results with
   FF.mp4. Nothing is recorded in real time and nothing is captured off the
   screen, so the file comes out clean and takes about a second per play.

   Two deliberate choices:

     H.264 in MP4, not WebM. WebM is far easier to produce, and an iPad will
     not play it. The whole point is plays on an iPad.

     The SVG field is rasterised through an <img> with a data URL. Painting an
     SVG to a canvas taints it in some browsers when it references outside
     resources, so the markup is serialised standalone with no external refs.

   The video is silent. Browsers give no way to capture speech synthesis into
   a recording, so the announcer stays in the app.
   ========================================================================== */
(function (FF) {
  'use strict';

  var FPS = 30;
  var TAIL_SECONDS = 1.2;      // hold on the last frame so it does not just stop

  function supported() {
    return typeof window !== 'undefined'
      && typeof window.VideoEncoder === 'function'
      && typeof window.VideoFrame === 'function'
      && !!FF.mp4;
  }

  /* Ask the browser what it will actually encode.

     BASELINE FIRST, deliberately. High and Main profiles allow B-frames, and a
     B-frame arrives out of presentation order - which an MP4 has to describe
     with a composition-offset table this muxer does not write. The result was a
     file with the right duration that sat on one frame. Baseline has no frame
     reordering at all, so decode order is presentation order and the simple
     timing tables are correct. */
  function pickConfig(width, height) {
    var candidates = [
      'avc1.42E01F',   // Constrained baseline, level 3.1
      'avc1.42E028',   // Constrained baseline, level 4.0
      'avc1.4D401F',   // Main, if baseline is somehow unavailable
      'avc1.640028'    // High, last resort
    ];
    var chain = Promise.resolve(null);
    candidates.forEach(function (codec) {
      chain = chain.then(function (found) {
        if (found) return found;
        var config = {
          codec: codec,
          width: width,
          height: height,
          bitrate: 3500000,
          framerate: FPS,
          latencyMode: 'realtime',     // also asks for no frame reordering
          avc: { format: 'avc' }       // length-prefixed, which is what MP4 wants
        };
        return window.VideoEncoder.isConfigSupported(config)
          .then(function (result) { return result.supported ? config : null; })
          ['catch'](function () { return null; });
      });
    });
    return chain;
  }

  /* Serialise the live SVG and paint it into the canvas. */
  function drawSvg(svg, canvas, ctx) {
    return new Promise(function (resolve, reject) {
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', canvas.width);
      clone.setAttribute('height', canvas.height);

      var markup = new XMLSerializer().serializeToString(clone);
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);

      var img = new Image();
      img.onload = function () {
        ctx.fillStyle = '#17401A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve();
      };
      img.onerror = function () { reject(new Error('Could not rasterise the field')); };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------------------
     record(opts)
       svg          the field element to capture
       drawAt(t)    called before each frame; must render the play at time t
       duration     seconds of play
       width/height output size in pixels (rounded to even, which H.264 needs)
       onProgress   0..1
     Resolves with a Blob.
     ---------------------------------------------------------------------- */
  function record(opts) {
    if (!supported()) {
      return Promise.reject(new Error('This browser cannot make MP4 files.'));
    }

    var width = Math.round((opts.width || 960) / 2) * 2;
    var height = Math.round((opts.height || 720) / 2) * 2;
    var duration = (opts.duration || 5) + TAIL_SECONDS;
    var total = Math.max(1, Math.round(duration * FPS));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { alpha: false });

    return pickConfig(width, height).then(function (config) {
      if (!config) throw new Error('No supported H.264 encoder on this device.');

      var frames = [];
      var avcC = null;

      var encoder = new window.VideoEncoder({
        output: function (chunk, meta) {
          if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) {
            avcC = new Uint8Array(meta.decoderConfig.description);
          }
          var data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          frames.push({
            data: data,
            timestamp: chunk.timestamp,   // microseconds, from the encoder
            duration: Math.round(90000 / FPS),
            key: chunk.type === 'key'
          });
        },
        error: function (e) { console.error('[recorder]', e); }
      });

      encoder.configure(config);

      var index = 0;
      function step() {
        if (index >= total) return Promise.resolve();

        var t = Math.min(opts.duration, index / FPS);
        opts.drawAt(t);

        return drawSvg(opts.svg, canvas, ctx).then(function () {
          var frame = new window.VideoFrame(canvas, {
            timestamp: Math.round((index / FPS) * 1000000),   // microseconds
            duration: Math.round(1000000 / FPS)
          });
          /* A keyframe every second keeps the file seekable. */
          encoder.encode(frame, { keyFrame: index % FPS === 0 });
          frame.close();
          index++;
          if (opts.onProgress) opts.onProgress(index / total);

          /* Yield between frames so the tab stays responsive and the encoder
             queue does not run away. */
          return new Promise(function (r) { setTimeout(r, 0); }).then(step);
        });
      }

      return step()
        .then(function () { return encoder.flush(); })
        .then(function () {
          encoder.close();
          if (!frames.length) throw new Error('The encoder produced no frames.');
          if (!avcC) throw new Error('The encoder gave no decoder configuration.');

          /* Trust the encoder's own timestamps rather than assuming a
             perfectly even cadence, and put them in order before measuring
             the gaps - a frame arriving late would otherwise produce a
             negative duration and a file that will not play. */
          /* Tell the two failure modes apart. A frozen video is either frames
             that were all identical, or good frames the container described
             badly - and they look the same from the outside. Inter-frames of a
             genuinely still picture compress to almost nothing, so their size
             says which happened. */
          var inter = frames.filter(function (f) { return !f.key; });
          var biggest = inter.reduce(function (m, f) {
            return Math.max(m, f.data.length);
          }, 0);
          if (inter.length > 4 && biggest < 200) {
            console.warn('[recorder] every frame encoded to under ' + biggest
              + ' bytes, so the canvas was not changing between frames - the'
              + ' problem is the drawing, not the container.');
          }

          frames.sort(function (a, b) { return a.timestamp - b.timestamp; });
          var TICKS = 90000 / 1000000;          // microseconds -> timescale
          var fallback = Math.round(90000 / FPS);
          frames.forEach(function (f, i) {
            var next = frames[i + 1];
            var gap = next ? Math.round((next.timestamp - f.timestamp) * TICKS) : fallback;
            f.duration = gap > 0 ? gap : fallback;
          });
          return FF.mp4.build({
            width: width,
            height: height,
            timescale: 90000,
            frames: frames,
            avcC: avcC
          });
        });
    });
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function safeFilename(name) {
    return String(name || 'play').replace(/[^\w\- ]+/g, '').trim()
      .replace(/\s+/g, '-').toLowerCase() || 'play';
  }

  FF.recorder = {
    supported: supported,
    record: record,
    download: download,
    safeFilename: safeFilename,
    FPS: FPS
  };
})(window.FF = window.FF || {});
