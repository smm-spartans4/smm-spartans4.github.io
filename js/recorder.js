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

  /* ------------------------------------------------------------------------
     The caption bar.

     A video saved to an iPad loses its filename the moment it lands in Photos,
     which leaves nine near-identical green rectangles and no way to tell which
     one is the jet sweep. So the play says its own name on screen.

     Painted with the 2D context rather than added to the SVG, because the SVG
     is serialised to a data URL and rasterised standalone - a webfont
     referenced from inside it would not load. Drawn straight onto the canvas,
     the fonts the page has already loaded are simply available.
     ---------------------------------------------------------------------- */

  var TITLE_BG = '#17401A';      // the team green, same as the site header
  /* --font-display from the stylesheet, spelled out: a canvas cannot read a
     CSS custom property, and this has to fall back the same way the page does. */
  var TITLE_FONT = 'Cinzel, "Trajan Pro", Optima, "Palatino Linotype", '
    + 'Georgia, "Times New Roman", serif';

  function drawTitle(ctx, canvas, band, text) {
    if (!band) return;

    ctx.save();
    ctx.fillStyle = TITLE_BG;
    ctx.fillRect(0, 0, canvas.width, band);

    /* A hairline under the bar, so the caption reads as a caption rather than
       as empty sky above the back of the end zone. */
    var rule = Math.max(2, Math.round(band * 0.035));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fillRect(0, band - rule, canvas.width, rule);

    var max = canvas.width - Math.round(canvas.width * 0.05) * 2;
    var size = Math.round(band * 0.5);
    var floor = Math.round(band * 0.3);

    /* Shrink to fit before cutting anything: a long play name is far better
       small than truncated, and most of them are only two or three words. */
    for (;;) {
      ctx.font = '700 ' + size + 'px ' + TITLE_FONT;
      if (ctx.measureText(text).width <= max || size <= floor) break;
      size -= 1;
    }
    while (text.length > 4 && ctx.measureText(text).width > max) {
      text = text.replace(/…$/, '').slice(0, -1) + '…';
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    /* Nudged up by the rule so the text sits centred in the green, not in the
       band-plus-hairline, which reads as very slightly low. */
    ctx.fillText(text, canvas.width / 2, (band - rule) / 2);
    ctx.restore();
  }

  /* Serialise the live SVG and paint it into the canvas, below the caption. */
  function drawSvg(svg, canvas, ctx, layout) {
    return new Promise(function (resolve, reject) {
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', layout.width);
      clone.setAttribute('height', layout.height);

      var markup = new XMLSerializer().serializeToString(clone);
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);

      var settled = false;
      var watchdog = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('A frame took too long to draw. The field could not '
          + 'be turned into an image.'));
      }, 8000);

      var img = new Image();
      img.onload = function () {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        ctx.fillStyle = TITLE_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, layout.top, layout.width, layout.height);
        resolve();
      };
      img.onerror = function () {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        reject(new Error('The field could not be turned into an image.'));
      };
      img.src = url;
    });
  }

  /* ------------------------------------------------------------------------
     record(opts)
       svg          the field element to capture
       drawAt(t)    called before each frame; must render the play at time t
       duration     seconds of play
       width/height size of the FIELD in pixels; the caption bar is added on
                    top of this, so the finished video is a little taller
       title        captioned above the field; omit for no caption bar
       onProgress   0..1
     Resolves with a Blob.
     ---------------------------------------------------------------------- */
  function record(opts) {
    if (!supported()) {
      return Promise.reject(new Error('This browser cannot make MP4 files.'));
    }

    var width = Math.round((opts.width || 960) / 2) * 2;
    var fieldH = Math.round((opts.height || 720) / 2) * 2;

    /* Every dimension stays even, which H.264 requires, so the bar is rounded
       to two pixels rather than one. */
    var title = String(opts.title || '').trim();
    var band = title ? Math.round(Math.max(46, width * 0.085) / 2) * 2 : 0;
    var height = fieldH + band;
    var layout = { top: band, width: width, height: fieldH };

    var duration = (opts.duration || 5) + TAIL_SECONDS;
    var total = Math.max(1, Math.round(duration * FPS));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

    console.log('[recorder] starting: ' + total + ' frames at ' + width + 'x' + height);

    /* Have Cinzel in hand before anything measures text in it. Asking after
       the first frame would caption that frame in a fallback serif at one size
       and every later frame in Cinzel at another - a caption that visibly
       resets a thirtieth of a second in. */
    var fontReady = (document.fonts && document.fonts.load && band)
      ? document.fonts.load('700 32px Cinzel')['catch'](function () { return null; })
      : Promise.resolve(null);

    return fontReady.then(function () {
      return pickConfig(width, height);
    }).then(function (config) {
      if (!config) throw new Error('No supported H.264 encoder on this device.');
      console.log('[recorder] codec ' + config.codec);

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

      /* A cheap fingerprint of what is actually on the canvas. Two frames from
         different moments of the play must not produce the same number; if
         they do, the drawing never changed and no amount of container work
         will unfreeze the video. */
      function fingerprint() {
        var px = ctx.getImageData(0, 0, width, height).data;
        var sum = 0;
        for (var i = 0; i < px.length; i += 997 * 4) {
          sum = (sum * 31 + px[i] + px[i + 1] * 3 + px[i + 2] * 7) >>> 0;
        }
        return sum;
      }
      var prints = {};

      var index = 0;
      function step() {
        if (index >= total) return Promise.resolve();

        var t = Math.min(opts.duration, index / FPS);
        opts.drawAt(t);

        return drawSvg(opts.svg, canvas, ctx, layout).then(function () {
          drawTitle(ctx, canvas, band, title);
          /* Sample near the start and around the middle of the play. */
          var mid = Math.round((opts.duration * FPS) / 2);
          if (index === 1 || index === mid) prints[index] = fingerprint();
          var frame = new window.VideoFrame(canvas, {
            timestamp: Math.round((index / FPS) * 1000000),   // microseconds
            duration: Math.round(1000000 / FPS)
          });
          /* A keyframe every second keeps the file seekable. */
          encoder.encode(frame, { keyFrame: index % FPS === 0 });
          frame.close();
          index++;
          if (index === 1 || index % 30 === 0 || index === total) {
            console.log('[recorder] drew frame ' + index + '/' + total
              + ', encoder queue ' + encoder.encodeQueueSize
              + ', chunks out ' + frames.length);
          }
          if (opts.onProgress) opts.onProgress(index / total);

          /* Yield between frames so the tab stays responsive and the encoder
             queue does not run away. */
          return new Promise(function (r) { setTimeout(r, 0); }).then(step);
        });
      }

      return step()
        .then(function () {
          console.log('[recorder] all frames drawn, flushing the encoder');
          return encoder.flush();
        })
        .then(function () {
          encoder.close();
          var keys = Object.keys(prints);
          if (keys.length === 2 && prints[keys[0]] === prints[keys[1]]) {
            throw new Error('The field looked identical at the start and the '
              + 'middle of the play, so the video would be a still. The '
              + 'drawing is at fault, not the video file.');
          }
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
          console.log('[recorder] ' + frames.length + ' frames, codec '
            + config.codec + ', ' + width + 'x' + height);
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
