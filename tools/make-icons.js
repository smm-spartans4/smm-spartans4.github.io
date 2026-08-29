/* ============================================================================
   One-off icon generator.  node tools/make-icons.js

   NOT a build step - the site never runs it. It exists so the logo and home
   screen icons can be regenerated if the art or team colors change, without
   needing an image editor.

   Sources (both live in icons/):
     spartan.png          the helmet mark, dark green on transparency
     spartan-warrior.png  the warrior illustration, on a flat light background

   Writes:
     spartan-white.png      helmet recolored white, for the dark nav bar
     icon-192.png           warrior on a dark green tile, Android / Chrome
     icon-512.png           same, larger, also used as the maskable icon
     apple-touch-icon.png   same, the size iOS wants for Add to Home Screen

   iOS will not accept an SVG for a home screen icon, so these have to be real
   PNGs. Rather than pull in a graphics library this reads and writes the PNG
   bytes directly, using the zlib that ships with Node.
   ========================================================================== */
'use strict';

var fs = require('fs');
var zlib = require('zlib');
var path = require('path');

var GREEN_TOP = [0x1D, 0x50, 0x22];     // tile gradient, light end
var GREEN_BOTTOM = [0x0B, 0x24, 0x10];  // tile gradient, dark end
var FIGURE_FRACTION = 0.88;             // how much of the tile the warrior fills
var KEY_TOLERANCE = 60;                 // how close to the corner color counts as background

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
  ihdr[8] = 8;
  ihdr[9] = 6;

  var raw = Buffer.alloc(h * (w * 4 + 1));
  var p = 0;
  for (var y = 0; y < h; y++) {
    raw[p++] = 0;
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

/* ---------- PNG decode: 8-bit RGBA, non-interlaced -------------------------- */

function readPng(file) {
  var b = fs.readFileSync(file);
  var w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (b[24] !== 8 || b[25] !== 6) {
    throw new Error(file + ' must be 8-bit RGBA (depth ' + b[24] + ', type ' + b[25] + ')');
  }

  var parts = [], p = 8;
  while (p < b.length) {
    var len = b.readUInt32BE(p);
    if (b.toString('ascii', p + 4, p + 8) === 'IDAT') parts.push(b.slice(p + 8, p + 8 + len));
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

/* ---------- background removal ----------------------------------------------
   The warrior sits on a flat light background, but his armor and shield are
   light gray too. Matching that color globally would punch holes through the
   figure, so instead this floods inward from the border: only background that
   is actually CONNECTED to the edge is removed, and the dark outline around
   the figure stops the flood at his silhouette. */

function dist(data, i, ref) {
  return Math.abs(data[i] - ref[0]) + Math.abs(data[i + 1] - ref[1]) + Math.abs(data[i + 2] - ref[2]);
}

function keyOutBackground(img) {
  var w = img.width, h = img.height, d = Buffer.from(img.data);

  /* Reference color: the most common color along the border, NOT the average
     of the corners. The figure runs off the bottom edge here, so averaging
     corners produced a muddy value that matched no actual pixel and the flood
     removed nothing. The mode ignores whatever part of the subject touches an
     edge. */
  var buckets = {};
  function sample(x, y) {
    var i = (y * w + x) * 4;
    var key = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
    var b = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
    b.n++; b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2];
  }
  for (var bx = 0; bx < w; bx++) { sample(bx, 0); sample(bx, h - 1); }
  for (var by = 0; by < h; by++) { sample(0, by); sample(w - 1, by); }

  var best = null;
  Object.keys(buckets).forEach(function (k) {
    if (!best || buckets[k].n > best.n) best = buckets[k];
  });
  var ref = [Math.round(best.r / best.n), Math.round(best.g / best.n),
             Math.round(best.b / best.n)];

  var isBg = new Uint8Array(w * h);
  var queue = [];

  function consider(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    var n = y * w + x;
    if (isBg[n]) return;
    if (dist(d, n * 4, ref) > KEY_TOLERANCE) return;
    isBg[n] = 1;
    queue.push(n);
  }

  for (var x = 0; x < w; x++) { consider(x, 0); consider(x, h - 1); }
  for (var y = 0; y < h; y++) { consider(0, y); consider(w - 1, y); }

  while (queue.length) {
    var n = queue.pop();
    var px = n % w, py = (n - px) / w;
    consider(px + 1, py); consider(px - 1, py);
    consider(px, py + 1); consider(px, py - 1);
  }

  /* Hard-clear the flood, then feather one pixel: anything still standing that
     touches removed background gets an alpha based on how close it was to the
     background color, which keeps the silhouette from looking cut out. */
  for (var i = 0; i < w * h; i++) if (isBg[i]) d[i * 4 + 3] = 0;

  for (var yy = 0; yy < h; yy++) {
    for (var xx = 0; xx < w; xx++) {
      var m = yy * w + xx;
      if (isBg[m]) continue;
      var touches = (xx > 0 && isBg[m - 1]) || (xx < w - 1 && isBg[m + 1])
        || (yy > 0 && isBg[m - w]) || (yy < h - 1 && isBg[m + w]);
      if (!touches) continue;
      var closeness = Math.min(1, dist(d, m * 4, ref) / (KEY_TOLERANCE * 1.6));
      d[m * 4 + 3] = Math.round(d[m * 4 + 3] * closeness);
    }
  }

  return { width: w, height: h, data: d };
}

/* Tightest box still holding the figure. */
function boundingBox(img) {
  var w = img.width, h = img.height, d = img.data;
  var minX = w, minY = h, maxX = -1, maxY = -1;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/* A square crop anchored near the top of the figure. At 60 physical pixels on
   a home screen the whole body is mush; the helmet and shoulders are what
   actually reads. */
function squareCrop(img, box) {
  var side = Math.min(Math.max(box.w, Math.round(box.h * 0.62)), img.height);
  var cx = box.x + box.w / 2;
  var x0 = Math.round(Math.max(0, Math.min(img.width - side, cx - side / 2)));
  var y0 = Math.round(Math.max(0, Math.min(img.height - side, box.y - side * 0.04)));

  var out = Buffer.alloc(side * side * 4);
  for (var y = 0; y < side; y++) {
    img.data.copy(out, y * side * 4,
      ((y0 + y) * img.width + x0) * 4,
      ((y0 + y) * img.width + x0 + side) * 4);
  }
  return { width: side, height: side, data: out };
}

/* Box-filter downscale in premultiplied alpha, so edges do not pick up a halo
   of whatever sat under the transparent pixels. */
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

function recolorWhite(img) {
  var out = Buffer.from(img.data);
  for (var i = 0; i < out.length; i += 4) { out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; }
  return { width: img.width, height: img.height, data: out };
}

/* Composite a cut-out onto a dark green tile with a soft vertical gradient -
   flat backgrounds look like a screenshot, a gradient looks like an icon. */
function tile(art, size, fraction) {
  var out = Buffer.alloc(size * size * 4);
  for (var y = 0; y < size; y++) {
    var f = y / (size - 1);
    for (var x = 0; x < size; x++) {
      var o = (y * size + x) * 4;
      for (var c = 0; c < 3; c++) {
        out[o + c] = Math.round(GREEN_TOP[c] + (GREEN_BOTTOM[c] - GREEN_TOP[c]) * f);
      }
      out[o + 3] = 255;
    }
  }

  var inner = Math.round(size * fraction);
  var small = resize(art, inner);
  var offX = Math.round((size - inner) / 2);
  var offY = Math.round((size - inner) / 2);

  for (var yy = 0; yy < inner; yy++) {
    for (var xx = 0; xx < inner; xx++) {
      var s = (yy * inner + xx) * 4;
      var a = small.data[s + 3] / 255;
      if (!a) continue;
      var d = ((yy + offY) * size + (xx + offX)) * 4;
      for (var ch = 0; ch < 3; ch++) {
        out[d + ch] = Math.round(out[d + ch] * (1 - a) + small.data[s + ch] * a);
      }
    }
  }
  return out;
}

/* ---------- run -------------------------------------------------------------- */

var dir = path.join(__dirname, '..', 'icons');

/* The nav bar mark, from the helmet logo. */
var helmetFile = path.join(dir, 'spartan.png');
if (fs.existsSync(helmetFile)) {
  var helmet = readPng(helmetFile);
  var white = recolorWhite(helmet);
  writePng(path.join(dir, 'spartan-white.png'), white.width, white.height, white.data);
  console.log('wrote spartan-white.png  (nav mark)');
}

/* The home screen icons, from the warrior illustration. */
var warriorFile = path.join(dir, 'spartan-warrior.png');
if (!fs.existsSync(warriorFile)) {
  console.error('Missing ' + warriorFile);
  process.exit(1);
}

var warrior = readPng(warriorFile);
console.log('read spartan-warrior.png  ' + warrior.width + 'x' + warrior.height);

var cut = keyOutBackground(warrior);
var box = boundingBox(cut);
console.log('figure occupies ' + box.w + 'x' + box.h + ' at ' + box.x + ',' + box.y);

var art = squareCrop(cut, box);
console.log('square crop ' + art.width + 'px');

[[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]
  .forEach(function (spec) {
    var file = path.join(dir, spec[1]);
    writePng(file, spec[0], spec[0], tile(art, spec[0], FIGURE_FRACTION));
    console.log('wrote ' + spec[1] + '  (' + fs.statSync(file).size + ' bytes)');
  });
