/* ============================================================================
   One-off icon generator.  node tools/make-icons.js

   NOT a build step - the site never runs it. It exists so the logo and home
   screen icons can be regenerated if the source art or team colors change,
   without needing an image editor.

   Reads icons/spartan.png (dark green helmet on transparency) and writes:

     icons/spartan-white.png    the helmet recolored white, for the dark header
     icons/icon-192.png         white helmet on team green, for Android/Chrome
     icons/icon-512.png         same, larger
     icons/apple-touch-icon.png same, the size iOS wants

   iOS will not accept an SVG for an Add to Home Screen icon, so these have to
   be real PNGs. Rather than pull in a graphics library this reads and writes
   the PNG bytes directly, using the zlib that ships with Node.
   ========================================================================== */
'use strict';

var fs = require('fs');
var zlib = require('zlib');
var path = require('path');

var BG = [0x17, 0x40, 0x1A];    // team green, same as the site header
var LOGO_FRACTION = 0.78;       // how much of the tile the helmet fills

/* ---------- PNG encode ----------------------------------------------------- */

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

function writePng(file, w, h, rgba) {
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // RGBA

  var raw = Buffer.alloc(h * (w * 4 + 1));
  var p = 0;
  for (var y = 0; y < h; y++) {
    raw[p++] = 0;                       // filter: none
    rgba.copy(raw, p, y * w * 4, (y + 1) * w * 4);
    p += w * 4;
  }

  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]));
}

/* ---------- PNG decode ------------------------------------------------------
   Only what this needs: 8-bit RGBA, non-interlaced, with the five standard
   scanline filters undone. */

function readPng(file) {
  var b = fs.readFileSync(file);
  var w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6) {
    throw new Error(file + ' must be 8-bit RGBA (got depth ' + b[24] + ', type ' + b[25] + ')');
  }

  var parts = [], p = 8;
  while (p < b.length) {
    var len = b.readUInt32BE(p);
    var type = b.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') parts.push(b.slice(p + 8, p + 8 + len));
    p += 12 + len;
  }

  var raw = zlib.inflateSync(Buffer.concat(parts));
  var bpp = 4, stride = w * 4;
  var out = Buffer.alloc(h * stride), q = 0;

  for (var y = 0; y < h; y++) {
    var f = raw[q++];
    var line = raw.slice(q, q + stride);
    q += stride;
    for (var x = 0; x < stride; x++) {
      var a = x >= bpp ? out[y * stride + x - bpp] : 0;
      var up = y > 0 ? out[(y - 1) * stride + x] : 0;
      var ul = (x >= bpp && y > 0) ? out[(y - 1) * stride + x - bpp] : 0;
      var v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += ((a + up) >> 1);
      else if (f === 4) {
        var pa = Math.abs(up - ul), pb = Math.abs(a - ul), pc = Math.abs(a + up - 2 * ul);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : ul);
      }
      out[y * stride + x] = v & 255;
    }
  }
  return { width: w, height: h, data: out };
}

/* ---------- image work ------------------------------------------------------ */

/* Keep the shape, throw away the color. The helmet is dark green, which would
   vanish against the dark green header. */
function recolorWhite(img) {
  var out = Buffer.from(img.data);
  for (var i = 0; i < out.length; i += 4) {
    out[i] = 255; out[i + 1] = 255; out[i + 2] = 255;
  }
  return { width: img.width, height: img.height, data: out };
}

/* Box-filter downscale, averaging in premultiplied alpha so the edges do not
   pick up a halo of whatever color sits under transparent pixels. */
function resize(img, size) {
  var out = Buffer.alloc(size * size * 4);
  var scale = img.width / size;

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var x0 = Math.floor(x * scale), x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale));
      var y0 = Math.floor(y * scale), y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale));
      var r = 0, g = 0, bl = 0, al = 0, n = 0;

      for (var sy = y0; sy < y1 && sy < img.height; sy++) {
        for (var sx = x0; sx < x1 && sx < img.width; sx++) {
          var i = (sy * img.width + sx) * 4;
          var a = img.data[i + 3] / 255;
          r += img.data[i] * a; g += img.data[i + 1] * a; bl += img.data[i + 2] * a;
          al += a; n++;
        }
      }

      var o = (y * size + x) * 4;
      if (!n || al === 0) { out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0; continue; }
      out[o] = Math.round(r / al);
      out[o + 1] = Math.round(g / al);
      out[o + 2] = Math.round(bl / al);
      out[o + 3] = Math.round((al / n) * 255);
    }
  }
  return { width: size, height: size, data: out };
}

/* Composite the helmet onto a solid green tile, centered. */
function tile(logo, size) {
  var out = Buffer.alloc(size * size * 4);
  for (var i = 0; i < out.length; i += 4) {
    out[i] = BG[0]; out[i + 1] = BG[1]; out[i + 2] = BG[2]; out[i + 3] = 255;
  }

  var inner = Math.round(size * LOGO_FRACTION);
  var small = resize(logo, inner);
  var off = Math.round((size - inner) / 2);

  for (var y = 0; y < inner; y++) {
    for (var x = 0; x < inner; x++) {
      var s = (y * inner + x) * 4;
      var a = small.data[s + 3] / 255;
      if (!a) continue;
      var d = ((y + off) * size + (x + off)) * 4;
      for (var c = 0; c < 3; c++) {
        out[d + c] = Math.round(out[d + c] * (1 - a) + small.data[s + c] * a);
      }
    }
  }
  return out;
}

/* ---------- run -------------------------------------------------------------- */

var dir = path.join(__dirname, '..', 'icons');
var source = path.join(dir, 'spartan.png');

if (!fs.existsSync(source)) {
  console.error('Missing ' + source + ' - put the team logo there first.');
  process.exit(1);
}

var logo = readPng(source);
console.log('read spartan.png  ' + logo.width + 'x' + logo.height);

var white = recolorWhite(logo);
writePng(path.join(dir, 'spartan-white.png'), white.width, white.height, white.data);
console.log('wrote spartan-white.png');

[[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]
  .forEach(function (spec) {
    var file = path.join(dir, spec[1]);
    writePng(file, spec[0], spec[0], tile(white, spec[0]));
    console.log('wrote ' + spec[1] + '  (' + fs.statSync(file).size + ' bytes)');
  });
