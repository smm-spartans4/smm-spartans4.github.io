/* ============================================================================
   FF.routes - the geometry and timing behind a hand-drawn route.

   A route is an array of { t, xYards, yYards } in play-relative yards. Drawing
   produces a lot of raw points; these helpers thin them down to the shape the
   coach actually drew and then spread the timing along it.

   Timing here is deliberately unfussy. These are 4th graders: a route is a
   loose picture of where to go and roughly when, not a stopwatch script.
   ========================================================================== */
(function (FF) {
  'use strict';

  function dist(a, b) {
    var dx = a.xYards - b.xYards, dy = a.yYards - b.yYards;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function totalLength(pts) {
    var sum = 0;
    for (var i = 1; i < pts.length; i++) sum += dist(pts[i - 1], pts[i]);
    return sum;
  }

  /* A route with no real movement - the seeded zone defenders, or a player who
     just holds their spot. Rendered as no line at all rather than a stub. */
  function isStatic(pts) {
    return !pts || pts.length < 2 || totalLength(pts) < 0.4;
  }

  /* Perpendicular distance from p to the segment ab. */
  function pointToSegment(p, a, b) {
    var vx = b.xYards - a.xYards, vy = b.yYards - a.yYards;
    var wx = p.xYards - a.xYards, wy = p.yYards - a.yYards;
    var len2 = vx * vx + vy * vy;
    var t = len2 ? ((wx * vx + wy * vy) / len2) : 0;
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    var dx = wx - t * vx, dy = wy - t * vy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* Ramer-Douglas-Peucker. Keeps corners, drops the jitter between them, so a
     finger-drawn line becomes a clean coach's-whiteboard line. */
  function simplify(pts, epsilon) {
    if (!pts || pts.length < 3) return (pts || []).slice();
    epsilon = epsilon === undefined ? 0.35 : epsilon;

    var first = 0, last = pts.length - 1;
    var maxDist = 0, index = -1;

    for (var i = first + 1; i < last; i++) {
      var d = pointToSegment(pts[i], pts[first], pts[last]);
      if (d > maxDist) { maxDist = d; index = i; }
    }

    if (maxDist > epsilon && index > 0) {
      var left = simplify(pts.slice(first, index + 1), epsilon);
      var right = simplify(pts.slice(index), epsilon);
      return left.slice(0, left.length - 1).concat(right);
    }
    return [pts[first], pts[last]];
  }

  /* Spread t along the route by distance travelled, so the player moves at a
     steady speed instead of racing through the parts drawn quickly. */
  function retime(pts, durationSeconds) {
    var out = pts.map(function (p) {
      return { t: 0, xYards: p.xYards, yYards: p.yYards };
    });
    if (out.length === 0) return out;
    if (out.length === 1) { out[0].t = 0; return out; }

    var total = totalLength(out);
    if (total < 0.001) {
      out.forEach(function (p, i) {
        p.t = durationSeconds * (i / (out.length - 1));
      });
      return out;
    }

    var run = 0;
    out[0].t = 0;
    for (var i = 1; i < out.length; i++) {
      run += dist(out[i - 1], out[i]);
      out[i].t = +(durationSeconds * (run / total)).toFixed(3);
    }
    return out;
  }

  /* Move a whole route with its player, so dragging someone to a new spot
     carries their route along instead of flattening it. */
  function translate(pts, dx, dy) {
    return (pts || []).map(function (p) {
      return { t: p.t, xYards: +(p.xYards + dx).toFixed(2),
               yYards: +(p.yYards + dy).toFixed(2) };
    });
  }

  /* Position along the route at time t - the basis of playback in step 6. */
  function pointAt(pts, t) {
    if (!pts || !pts.length) return null;
    if (t <= pts[0].t) return { xYards: pts[0].xYards, yYards: pts[0].yYards };
    var last = pts[pts.length - 1];
    if (t >= last.t) return { xYards: last.xYards, yYards: last.yYards };

    for (var i = 1; i < pts.length; i++) {
      if (t <= pts[i].t) {
        var a = pts[i - 1], b = pts[i];
        var span = b.t - a.t;
        var f = span ? (t - a.t) / span : 0;
        return {
          xYards: a.xYards + (b.xYards - a.xYards) * f,
          yYards: a.yYards + (b.yYards - a.yYards) * f
        };
      }
    }
    return { xYards: last.xYards, yYards: last.yYards };
  }

  FF.routes = {
    dist: dist, totalLength: totalLength, isStatic: isStatic,
    simplify: simplify, retime: retime, translate: translate, pointAt: pointAt
  };
})(window.FF = window.FF || {});
