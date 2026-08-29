/* ============================================================================
   One-off icon generator.  node tools/make-icons.js

   This is NOT a build step - the site never runs it and never depends on it.
   It exists so the home-screen icons can be regenerated if the team colors
   change, without needing an image editor.

   iOS will not accept an SVG for an Add to Home Screen icon, so these have to
   be real PNGs. Rather than pull in a graphics library, this writes the PNG
   bytes directly: RGBA scanlines, deflated with the built-in zlib, wrapped in
   the three chunks a PNG needs.
   ========================================================================== */
'use strict';

var fs = require('fs');
var zlib = require('zlib');
var path = require('path');

var BG = [0x17, 0x40, 0x1A];        // forest green, same as the site header
var BALL = [0xFF, 0xFF, 0xFF];
var TILT = -24 * Math.PI / 180;     // matches the brand mark in the nav

/* ---------- PNG writing --------------------------------------------------- */

var crcTable = (function () {
  var table = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  var body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, size, rgba) {
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 6;      // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  /* Each scanline is prefixed with its filter type; 0 means "none". */
  var raw = Buffer.alloc(size * (size * 4 + 1));
  var p = 0;
  for (var y = 0; y < size; y++) {
    raw[p++] = 0;
    rgba.copy(raw, p, y * size * 4, (y + 1) * size * 4);
    p += size * 4;
  }

  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

/* ---------- the drawing ---------------------------------------------------- */

/* A football is the overlap of two circles - a lens, pointed at both ends.
   Given the half-length and half-thickness we want, solve for the circles. */
function lensGeometry(halfLength, halfThickness) {
  var R = (halfLength * halfLength + halfThickness * halfThickness) / (2 * halfThickness);
  return { R: R, d: R - halfThickness };
}

function icon(size) {
  var rgba = Buffer.alloc(size * size * 4);
  var c = size / 2;
  var L = size * 0.30;              // stays inside the maskable safe zone
  var T = size * 0.19;
  var g = lensGeometry(L, T);
  var laceHalf = L * 0.44;
  var laceW = size * 0.017;
  var tickH = T * 0.52;
  var SS = 3;                       // supersample for smooth edges

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var hits = 0, lace = 0;
      for (var sy = 0; sy < SS; sy++) {
        for (var sx = 0; sx < SS; sx++) {
          var px = x + (sx + 0.5) / SS - c;
          var py = y + (sy + 0.5) / SS - c;

          /* rotate into the ball's own frame */
          var rx = px * Math.cos(-TILT) - py * Math.sin(-TILT);
          var ry = px * Math.sin(-TILT) + py * Math.cos(-TILT);

          var inLens = (rx * rx + (ry + g.d) * (ry + g.d) <= g.R * g.R) &&
                       (rx * rx + (ry - g.d) * (ry - g.d) <= g.R * g.R);
          if (!inLens) continue;
          hits++;

          var onSpine = Math.abs(ry) <= laceW && Math.abs(rx) <= laceHalf;
          var onTick = Math.abs(ry) <= tickH &&
            [-0.66, -0.22, 0.22, 0.66].some(function (f) {
              return Math.abs(rx - f * laceHalf) <= laceW;
            });
          if (onSpine || onTick) lace++;
        }
      }

      var total = SS * SS;
      var ballAmt = (hits - lace) / total;
      var i = (y * size + x) * 4;
      for (var ch = 0; ch < 3; ch++) {
        rgba[i + ch] = Math.round(BG[ch] + (BALL[ch] - BG[ch]) * ballAmt);
      }
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

var outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

[[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]
  .forEach(function (spec) {
    var file = path.join(outDir, spec[1]);
    writePng(file, spec[0], icon(spec[0]));
    console.log('wrote ' + spec[1] + '  (' + fs.statSync(file).size + ' bytes)');
  });
