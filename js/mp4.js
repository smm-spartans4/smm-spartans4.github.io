/* ============================================================================
   FF.mp4 - a minimal MP4 muxer for a single H.264 video track.

   WebCodecs hands back encoded H.264 frames but no container; a bare stream of
   frames is not a file anything will play. This wraps them in the boxes an MP4
   needs, which is the whole job:

       ftyp   what kind of file this is
       mdat   the frame bytes themselves
       moov   the index: timing, sizes, keyframes, and the decoder config

   Written out by hand rather than pulled from a library, so the project keeps
   its promise of no dependencies and no build step. It only handles what is
   needed here - one track, video only, constant timescale - and would need
   more work to be general.

   MP4 specifically, not WebM: an iPad will not play WebM, and putting plays on
   an iPad is the entire point.
   ========================================================================== */
(function (FF) {
  'use strict';

  /* ---------- byte assembly ------------------------------------------------ */

  function Writer() { this.parts = []; this.length = 0; }

  Writer.prototype.bytes = function (arr) {
    var b = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    this.parts.push(b);
    this.length += b.length;
    return this;
  };
  Writer.prototype.u8 = function (v) { return this.bytes([v & 0xFF]); };
  Writer.prototype.u16 = function (v) { return this.bytes([(v >> 8) & 0xFF, v & 0xFF]); };
  Writer.prototype.u32 = function (v) {
    return this.bytes([(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF]);
  };
  Writer.prototype.str = function (s) {
    var out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xFF);
    return this.bytes(out);
  };
  Writer.prototype.merge = function (other) {
    for (var i = 0; i < other.parts.length; i++) this.parts.push(other.parts[i]);
    this.length += other.length;
    return this;
  };
  Writer.prototype.toUint8 = function () {
    var out = new Uint8Array(this.length), at = 0;
    for (var i = 0; i < this.parts.length; i++) {
      out.set(this.parts[i], at);
      at += this.parts[i].length;
    }
    return out;
  };

  /* Every MP4 box is: length, four-character type, payload. */
  function box(type, payload) {
    var w = new Writer();
    w.u32(payload.length + 8).str(type).bytes(payload);
    return w.toUint8();
  }

  function fullBox(type, version, flags, payload) {
    var w = new Writer();
    w.u8(version).u8((flags >> 16) & 0xFF).u8((flags >> 8) & 0xFF).u8(flags & 0xFF);
    w.bytes(payload);
    return box(type, w.toUint8());
  }

  function concat(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].length;
    var out = new Uint8Array(total), at = 0;
    for (i = 0; i < list.length; i++) { out.set(list[i], at); at += list[i].length; }
    return out;
  }

  /* ---------- the boxes ----------------------------------------------------- */

  function ftyp() {
    var w = new Writer();
    w.str('isom').u32(512).str('isom').str('iso2').str('avc1').str('mp41');
    return box('ftyp', w.toUint8());
  }

  function mvhd(timescale, duration) {
    var w = new Writer();
    w.u32(0).u32(0).u32(timescale).u32(duration);
    w.u32(0x00010000);                 // rate 1.0
    w.u16(0x0100).u16(0);              // volume 1.0, reserved
    w.u32(0).u32(0);
    [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000]
      .forEach(function (v) { w.u32(v); });          // identity matrix
    for (var i = 0; i < 6; i++) w.u32(0);            // predefined
    w.u32(2);                                        // next track id
    return fullBox('mvhd', 0, 0, w.toUint8());
  }

  function tkhd(width, height, duration) {
    var w = new Writer();
    w.u32(0).u32(0).u32(1).u32(0).u32(duration);
    w.u32(0).u32(0);
    w.u16(0).u16(0).u16(0).u16(0);     // layer, group, volume, reserved
    [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000]
      .forEach(function (v) { w.u32(v); });
    w.u32(width << 16).u32(height << 16);            // 16.16 fixed point
    return fullBox('tkhd', 0, 3, w.toUint8());       // enabled | in movie
  }

  function mdhd(timescale, duration) {
    var w = new Writer();
    w.u32(0).u32(0).u32(timescale).u32(duration);
    w.u16(0x55C4).u16(0);              // language "und"
    return fullBox('mdhd', 0, 0, w.toUint8());
  }

  function hdlr() {
    var w = new Writer();
    w.u32(0).str('vide').u32(0).u32(0).u32(0).str('VideoHandler').u8(0);
    return fullBox('hdlr', 0, 0, w.toUint8());
  }

  function vmhd() {
    var w = new Writer();
    w.u16(0).u16(0).u16(0).u16(0);
    return fullBox('vmhd', 0, 1, w.toUint8());
  }

  /* "The media is in this same file" - the only case here. */
  function dinf() {
    var url = fullBox('url ', 0, 1, new Uint8Array(0));
    var entries = new Writer();
    entries.u32(1).bytes(url);
    return box('dinf', fullBox('dref', 0, 0, entries.toUint8()));
  }

  /* The sample description: says these are AVC frames, and carries the decoder
     config the encoder produced (SPS/PPS), without which nothing can decode. */
  function avc1(width, height, avcC) {
    var w = new Writer();
    for (var i = 0; i < 6; i++) w.u8(0);
    w.u16(1);                          // data reference index
    w.u16(0).u16(0).u32(0).u32(0).u32(0);
    w.u16(width).u16(height);
    w.u32(0x00480000).u32(0x00480000); // 72 dpi
    w.u32(0);
    w.u16(1);                          // frame count
    for (var j = 0; j < 32; j++) w.u8(0);            // compressor name
    w.u16(0x0018);                     // depth
    w.u16(0xFFFF);                     // predefined
    w.bytes(box('avcC', avcC));
    return box('avc1', w.toUint8());
  }

  function stsd(width, height, avcC) {
    var w = new Writer();
    w.u32(1).bytes(avc1(width, height, avcC));
    return fullBox('stsd', 0, 0, w.toUint8());
  }

  /* Sample timing, run-length encoded. */
  function stts(deltas) {
    var runs = [];
    deltas.forEach(function (d) {
      var last = runs[runs.length - 1];
      if (last && last[1] === d) last[0]++;
      else runs.push([1, d]);
    });
    var w = new Writer();
    w.u32(runs.length);
    runs.forEach(function (r) { w.u32(r[0]).u32(r[1]); });
    return fullBox('stts', 0, 0, w.toUint8());
  }

  /* Which samples are keyframes. Without this a player cannot seek. */
  function stss(keyframes) {
    var w = new Writer();
    w.u32(keyframes.length);
    keyframes.forEach(function (n) { w.u32(n); });
    return fullBox('stss', 0, 0, w.toUint8());
  }

  function stsz(sizes) {
    var w = new Writer();
    w.u32(0).u32(sizes.length);
    sizes.forEach(function (s) { w.u32(s); });
    return fullBox('stsz', 0, 0, w.toUint8());
  }

  /* Sample-to-chunk. Every sample lives in one chunk here, so this must say
     how many samples that chunk holds - saying "1" told players the chunk
     contained a single frame, and since stco declares no second chunk they
     could locate frame one and nothing after it. Right duration, one picture. */
  function stsc(sampleCount) {
    var w = new Writer();
    w.u32(1);                    // one entry
    w.u32(1);                    // ...starting at chunk 1
    w.u32(sampleCount);          // ...which holds every sample
    w.u32(1);                    // ...described by sample description 1
    return fullBox('stsc', 0, 0, w.toUint8());
  }

  function stco(offset) {
    var w = new Writer();
    w.u32(1).u32(offset);
    return fullBox('stco', 0, 0, w.toUint8());
  }

  /* ---------- assembly ------------------------------------------------------ */

  /*  build({ width, height, timescale, frames, avcC })
        frames: [{ data: Uint8Array, duration: int, key: bool }]
      Returns a Blob of type video/mp4. */
  function build(opts) {
    var width = opts.width, height = opts.height;
    var timescale = opts.timescale || 30000;
    var frames = opts.frames;

    var sizes = frames.map(function (f) { return f.data.length; });
    var deltas = frames.map(function (f) { return f.duration; });
    var keyframes = [];
    frames.forEach(function (f, i) { if (f.key) keyframes.push(i + 1); });
    var duration = deltas.reduce(function (a, b) { return a + b; }, 0);

    var stbl = box('stbl', concat([
      stsd(width, height, opts.avcC),
      stts(deltas),
      stss(keyframes),
      stsc(frames.length),
      stsz(sizes),
      stco(0)                          // patched below, once moov size is known
    ]));

    var minf = box('minf', concat([vmhd(), dinf(), stbl]));
    var mdia = box('mdia', concat([mdhd(timescale, duration), hdlr(), minf]));
    var trak = box('trak', concat([tkhd(width, height, duration), mdia]));
    var moov = box('moov', concat([mvhd(timescale, duration), trak]));

    /* moov comes first so the file starts playing without a full download,
       which means the sample offsets depend on how big moov turned out. */
    var mdatHeader = 8;
    var dataStart = ftyp().length + moov.length + mdatHeader;

    var stblPatched = box('stbl', concat([
      stsd(width, height, opts.avcC),
      stts(deltas),
      stss(keyframes),
      stsc(frames.length),
      stsz(sizes),
      stco(dataStart)
    ]));
    var minf2 = box('minf', concat([vmhd(), dinf(), stblPatched]));
    var mdia2 = box('mdia', concat([mdhd(timescale, duration), hdlr(), minf2]));
    var trak2 = box('trak', concat([tkhd(width, height, duration), mdia2]));
    var moov2 = box('moov', concat([mvhd(timescale, duration), trak2]));

    var payload = concat(frames.map(function (f) { return f.data; }));
    var mdat = box('mdat', payload);

    return new Blob([ftyp(), moov2, mdat], { type: 'video/mp4' });
  }

  FF.mp4 = { build: build };
})(window.FF = window.FF || {});
