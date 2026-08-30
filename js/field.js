/* ============================================================================
   FF.field - draws the to-scale field, and owns the coordinate system.

   TWO COORDINATE SYSTEMS (spec section 5). Data is ALWAYS in yards, never px.

     Absolute field yards
       x: 0 at the left sideline -> fieldWidthYards (30) at the right sideline
       y: 0 at the back of our own end zone
          10 = our goal line, 60 = their goal line, 70 = back of their end zone
       The offense always drives in the +y direction (up the screen).

     Play-relative yards  (what a play's start/route points actually store)
       y = 0 at THAT play's line of scrimmage, negative behind it.
       absY = endZoneDepthYards + play.lineOfScrimmageYard + relY

   SVG user units are yards, with y flipped so that +y is up the screen.
   ========================================================================== */
(function (FF) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  var COLOR = {
    turf:        '#2F7D32',
    turfStripe:  '#358A3A',
    endZone:     '#245F27',
    line:        '#FFFFFF',
    firstDown:   '#E53935',   // red dashed, fixed at midfield
    noRush:      '#FFC400',   // amber - deliberately not red/white/green
    los:         '#000000',   // black - hard to miss on turf
    fake:        '#FFEB3B',   // decoy selling a fake - bright yellow
    carrier:     '#D32F2F',   // whoever has the ball right now
    ball:        '#8B4513',   // leather
    zone:        '#FFEB3B',   // zone bubble fill
    zoneEdge:    '#F9A825',   // zone bubble edge
    offenseFill: '#FFFFFF',
    offenseText: '#12331A',
    defenseFill: '#263238',
    defenseText: '#FFFFFF'
  };

  var SIDE_MARGIN = 1.6;      // yards of out-of-bounds shown either side

  function el(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function totalLength(s) {
    return s.playingFieldLengthYards + (2 * s.endZoneDepthYards);
  }

  /* Convert a play-relative y to an absolute field y. */
  function absY(settings, lineOfScrimmageYard, relY) {
    return settings.endZoneDepthYards + lineOfScrimmageYard + relY;
  }

  /* Which slice of the field should we show for this play? Showing all 70
     yards makes the players thumbnail-sized, so we frame a window around the
     line of scrimmage instead.

     Two rules decide the window:
       - Show a little behind the line of scrimmage and the useful part ahead.
       - ALWAYS include the first-down line, with room to spare. That line is
         the whole point of a possession, so it must never sit off-screen.
     The window stays wider than it is tall, which is what lets the field fill
     the screen horizontally and carry real detail. */
  var VIEW_BEHIND_LOS = 11;   // room for the offensive backfield to breathe
  var VIEW_AHEAD_LOS  = 18;
  var FIRST_DOWN_MARGIN = 2.5;

  function viewForPlay(settings, play) {
    var total = totalLength(settings);
    var los = absY(settings, play ? play.lineOfScrimmageYard : settings.defaultStartingYardLine, 0);
    var firstDown = settings.endZoneDepthYards + settings.firstDownLineYards;

    var yFrom = los - VIEW_BEHIND_LOS;
    var yTo = Math.max(los + VIEW_AHEAD_LOS, firstDown + FIRST_DOWN_MARGIN);

    /* Nudge back inside the field without shrinking the window. */
    if (yTo > total) { yFrom -= (yTo - total); yTo = total; }
    if (yFrom < 0)   { yTo = Math.min(total, yTo - yFrom); yFrom = 0; }

    return { yFrom: yFrom, yTo: yTo };
  }

  function fullView(settings) {
    return { yFrom: 0, yTo: totalLength(settings) };
  }

  /* A tighter, wider crop for play-library thumbnails: enough field to read the
     shape of the play, without the first-down line forcing a tall frame. */
  function viewForThumb(settings, play) {
    var total = totalLength(settings);
    var los = absY(settings, play ? play.lineOfScrimmageYard : settings.defaultStartingYardLine, 0);
    var yFrom = clamp(los - 8, 0, total - 24);
    return { yFrom: yFrom, yTo: clamp(yFrom + 24, 0, total) };
  }

  /* ------------------------------------------------------------------------
     render(svg, opts)

     opts:
       settings              defaults to FF.store.settings()
       view                  {yFrom, yTo} in absolute yards, or 'full'
       lineOfScrimmageYard   draws a LOS marker if given
       showNoRush            draws the 7-yard no-rush guide (defensive plays)
       yardNumbers           default true

     Returns a context object with the coordinate helpers and the layer groups
     that later steps (routes, tokens, the ball) draw into.
     ---------------------------------------------------------------------- */
  function render(svg, opts) {
    opts = opts || {};
    var s = opts.settings || FF.store.settings();
    var view = (!opts.view || opts.view === 'full') ? fullView(s) : opts.view;
    var yFrom = view.yFrom, yTo = view.yTo;
    var W = s.fieldWidthYards;
    var H = yTo - yFrom;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.setAttribute('viewBox',
      (-SIDE_MARGIN) + ' 0 ' + (W + SIDE_MARGIN * 2) + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.classList.add('ff-field');   // idempotent: render() is called on every redraw

    /* y flip: absolute yard -> SVG user y */
    function uy(absoluteY) { return yTo - absoluteY; }
    function ux(x) { return x; }

    var gTurf     = el('g', { 'class': 'ff-turf' }, svg);
    var gMarks    = el('g', { 'class': 'ff-marks' }, svg);
    var gGuides   = el('g', { 'class': 'ff-guides' }, svg);
    var gRoutes   = el('g', { 'class': 'ff-routes' }, svg);
    var gTokens   = el('g', { 'class': 'ff-tokens' }, svg);
    var gOverlay  = el('g', { 'class': 'ff-overlay' }, svg);

    /* ---- turf, out of bounds, end zones --------------------------------- */

    el('rect', {
      x: -SIDE_MARGIN, y: 0, width: W + SIDE_MARGIN * 2, height: H,
      fill: '#1F5622'
    }, gTurf);   // out-of-bounds surround, darker

    el('rect', { x: 0, y: 0, width: W, height: H, fill: COLOR.turf }, gTurf);

    /* Mowing stripes every 5 yards - subtle, sells "to scale" at a glance. */
    for (var sy = 0; sy < totalLength(s); sy += 5) {
      if ((sy / 5) % 2 !== 0) continue;
      var top = Math.min(sy + 5, yTo), bot = Math.max(sy, yFrom);
      if (top <= yFrom || bot >= yTo) continue;
      el('rect', {
        x: 0, y: uy(top), width: W, height: (top - bot), fill: COLOR.turfStripe
      }, gTurf);
    }

    var ownGoal = s.endZoneDepthYards;
    var oppGoal = s.endZoneDepthYards + s.playingFieldLengthYards;

    [[0, ownGoal], [oppGoal, totalLength(s)]].forEach(function (z) {
      var bot = Math.max(z[0], yFrom), top = Math.min(z[1], yTo);
      if (top <= bot) return;
      el('rect', {
        x: 0, y: uy(top), width: W, height: top - bot,
        fill: COLOR.endZone
      }, gTurf);
    });

    /* ---- white lines ----------------------------------------------------- */

    /* Yard numbers sit here, and no horizontal line is allowed to run through
       them - each line is drawn as segments that stop short of these columns. */
    var NUM_X = [3.4, W - 3.4];
    var NUM_GAP = 1.5;                  // half-width of the protected column

    function segments() {
      var stops = [0];
      NUM_X.slice().sort(function (a, b) { return a - b; }).forEach(function (nx) {
        stops.push(nx - NUM_GAP, nx + NUM_GAP);
      });
      stops.push(W);
      var out = [];
      for (var i = 0; i < stops.length; i += 2) {
        if (stops[i + 1] > stops[i]) out.push([stops[i], stops[i + 1]]);
      }
      return out;
    }
    var NUM_SEGMENTS = segments();

    function hLine(atY, width, opacity, dash, color, layer, gapped) {
      if (atY < yFrom || atY > yTo) return null;
      var spans = gapped ? NUM_SEGMENTS : [[0, W]];
      spans.forEach(function (sp) {
        el('line', {
          x1: sp[0], y1: uy(atY), x2: sp[1], y2: uy(atY),
          stroke: color || COLOR.line,
          'stroke-width': width,
          'stroke-opacity': opacity === undefined ? 0.9 : opacity,
          'stroke-dasharray': dash || 'none'
        }, layer || gMarks);
      });
      return true;
    }

    /* yard lines every 5 yards across the playing field */
    for (var y = ownGoal + 5; y < oppGoal; y += 5) hLine(y, 0.13, 0.75, null, null, null, true);

    /* goal lines + end lines, thicker */
    hLine(ownGoal, 0.3, 1);
    hLine(oppGoal, 0.3, 1);
    hLine(0, 0.3, 1);
    hLine(totalLength(s), 0.3, 1);

    /* sidelines */
    [0, W].forEach(function (x) {
      el('line', {
        x1: x, y1: 0, x2: x, y2: H,
        stroke: COLOR.line, 'stroke-width': 0.3, 'stroke-opacity': 1
      }, gMarks);
    });

    /* yard numbers: count up from each goal line to midfield, then back down */
    if (opts.yardNumbers !== false) {
      for (var ny = ownGoal + 5; ny < oppGoal; ny += 5) {
        if (ny < yFrom || ny > yTo) continue;
        var num = Math.min(ny - ownGoal, oppGoal - ny);
        NUM_X.forEach(function (nx) {
          var t = el('text', {
            x: nx, y: uy(ny) + 0.62,
            'text-anchor': 'middle',
            'font-size': 1.75,
            'font-weight': 800,
            fill: COLOR.line,
            stroke: '#0C240F',
            'stroke-width': 0.16,
            'paint-order': 'stroke fill',
            'font-family': 'system-ui, sans-serif'
          }, gMarks);
          t.textContent = String(num);
        });
      }
    }

    /* ---- first-down line: fixed at midfield, a permanent marking --------- */

    var firstDownAbs = ownGoal + s.firstDownLineYards;
    hLine(firstDownAbs, 0.34, 1, '1.2 0.7', COLOR.firstDown, gMarks, true);
    if (opts.labels !== false && firstDownAbs >= yFrom && firstDownAbs <= yTo) {
      var fdLbl = el('text', {
        x: 0.5, y: uy(firstDownAbs) - 0.45,
        'text-anchor': 'start',
        'font-size': 0.7,
        'font-weight': 800,
        'letter-spacing': 0.05,
        fill: COLOR.firstDown,
        stroke: '#12331A',
        'stroke-width': 0.14,
        'paint-order': 'stroke fill',
        'font-family': 'system-ui, sans-serif'
      }, gMarks);
      fdLbl.textContent = 'FIRST DOWN';
    }

    /* ---- per-play guides -------------------------------------------------- */

    var los = opts.lineOfScrimmageYard;
    if (los !== undefined && los !== null) {
      var losAbs = absY(s, los, 0);
      hLine(losAbs, 0.22, 1, '0.9 0.6', COLOR.los, gGuides);

      if (opts.showNoRush) {
        var nrAbs = absY(s, los, s.noRushZoneYards);
        hLine(nrAbs, 0.18, 0.95, '1.4 0.7', COLOR.noRush, gGuides);
        if (opts.labels !== false && nrAbs >= yFrom && nrAbs <= yTo) {
          var lbl = el('text', {
            x: W - 0.5, y: uy(nrAbs) - 0.45,
            'text-anchor': 'end',
            'font-size': 0.7,
            'font-weight': 700,
            fill: COLOR.noRush,
            stroke: '#12331A',
            'stroke-width': 0.14,
            'paint-order': 'stroke fill',
            'font-family': 'system-ui, sans-serif'
          }, gGuides);
          /* A rusher must START on or behind this line, so it reads as the
             rush line, not a no-rush line. */
          lbl.textContent = 'Rush Line (' + s.noRushZoneYards + ' yd)';
        }
      }
    }

    var ctx = {
      svg: svg, settings: s, view: view,
      width: W, height: H,
      layers: { turf: gTurf, marks: gMarks, guides: gGuides,
                routes: gRoutes, tokens: gTokens, overlay: gOverlay },
      ux: ux, uy: uy,
      absY: function (relY, losYard) {
        return absY(s, losYard === undefined ? opts.lineOfScrimmageYard : losYard, relY);
      },
      /* Screen pointer -> field yards. Used by the play editor in step 3+. */
      pointToYards: function (evt) {
        var pt = svg.createSVGPoint();
        pt.x = evt.clientX; pt.y = evt.clientY;
        var p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { xYards: p.x, absY: yTo - p.y };
      }
    };
    return ctx;
  }

  /* ------------------------------------------------------------------------
     Player tokens: a little football-player figure, with its label in small
     text floating just above the head.

     The figure is drawn around (0,0) in a local group and then moved into
     place, so all the geometry below is readable as "a person" rather than as
     field math. It is roughly 2 yards tall - a real 4th grader is shorter, but
     at true height the figures are too small to read on a phone.

     Offense and defense are told apart by jersey color AND by the label text,
     never by color alone (spec section 12).
     ---------------------------------------------------------------------- */
  /* An athletic ready-to-run stance: small head, broad shoulders tapering to a
     narrow waist, long legs in a staggered stride, arms bent at the elbow.
     Limbs are round-capped strokes rather than boxes, which keeps the figure
     lean at small sizes. Each limb is drawn twice - once fat in the outline
     color, once thinner in the jersey color - so the figure stays legible
     against turf without needing a separate outline pass per shape. */
  var LIMBS = [
    'M  0.27 -0.44 L  0.50 -0.15 L  0.40  0.17',   /* near arm, bent  */
    'M -0.27 -0.44 L -0.50 -0.19 L -0.36  0.09',   /* far arm, bent   */
    'M -0.13  0.06 L -0.27  0.53 L -0.22  0.99',   /* trail leg       */
    'M  0.13  0.06 L  0.26  0.50 L  0.32  0.97'    /* lead leg        */
  ];
  var TORSO = 'M -0.29 -0.55 L 0.29 -0.55 L 0.17 0.11 L -0.17 0.11 Z';

  function playerFigure(g, fill, stroke) {
    LIMBS.forEach(function (d) {
      el('path', { d: d, fill: 'none', stroke: stroke, 'stroke-width': 0.27,
                   'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    });
    el('path', { d: TORSO, fill: stroke, stroke: stroke, 'stroke-width': 0.17,
                 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: 0, cy: -0.81, r: 0.29, fill: stroke }, g);

    LIMBS.forEach(function (d) {
      el('path', { d: d, fill: 'none', stroke: fill, 'stroke-width': 0.15,
                   'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    });
    el('path', { d: TORSO, fill: fill, stroke: fill, 'stroke-width': 0.05,
                 'stroke-linejoin': 'round' }, g);
    el('circle', { cx: 0, cy: -0.81, r: 0.21, fill: fill }, g);
  }

  /* The figure is ~2.2 units tall, so this puts a player a shade over 1.7
     yards - about right for a 4th grader, and still readable on a phone. */
  var DEFAULT_TOKEN_SCALE = 0.78;

  function drawToken(ctx, o) {
    var isDef = o.side === 'defense';
    var scale = o.scale || DEFAULT_TOKEN_SCALE;
    var x = ctx.ux(o.xYards);
    var y = ctx.uy(o.absY);

    var g = el('g', {
      'class': 'ff-token' + (isDef ? ' is-defense' : ' is-offense')
        + (o.faking ? ' is-faking' : ''),
      'data-position': o.positionId || '',
      transform: 'translate(' + x + ' ' + y + ')'
    }, o.layer || ctx.layers.tokens);

    var body = el('g', { transform: 'scale(' + scale + ')' }, g);

    /* Jersey color carries the state of the play at a glance:
         yellow = selling a fake right now
         red    = has the ball right now
       Both read correctly at a frozen or scrubbed frame, not just in motion. */
    var fill = o.fill
      || (o.carrying ? COLOR.carrier : null)
      || (o.faking ? COLOR.fake : null)
      || (isDef ? COLOR.defenseFill : COLOR.offenseFill);

    var outline = (fill === COLOR.defenseFill) ? '#FFFFFF' : '#12331A';
    playerFigure(body, fill, outline);

    if (o.faking && !o.carrying) {
      var tag = el('text', {
        x: 0, y: 1.72,
        'text-anchor': 'middle',
        'font-size': 0.62,
        'font-weight': 800,
        'letter-spacing': 0.05,
        fill: COLOR.fake,
        stroke: '#12331A',
        'stroke-width': 0.13,
        'paint-order': 'stroke fill',
        'font-family': 'system-ui, sans-serif',
        'pointer-events': 'none'
      }, body);
      tag.textContent = 'FAKE';
    }

    /* Label above the head. A dark halo keeps it readable over any turf shade. */
    var label = el('text', {
      x: 0, y: -1.42 * scale,
      'text-anchor': 'middle',
      'font-size': 1.05 * scale,
      'font-weight': 700,
      'letter-spacing': 0.03,
      fill: '#FFFFFF',
      stroke: '#12331A',
      'stroke-width': 0.16 * scale,
      'paint-order': 'stroke fill',
      'font-family': 'system-ui, sans-serif',
      'pointer-events': 'none'
    }, g);
    label.textContent = o.label || '';
    return g;
  }

  /* ------------------------------------------------------------------------
     Routes. Drawn as a smoothed line with an arrowhead at the end, in the
     coach's-whiteboard style: a fat dark halo underneath, a bright core on
     top, so the line stays legible over turf, yard lines and other routes.
     ---------------------------------------------------------------------- */

  /* Quadratic smoothing through the midpoints - rounds the corners a finger
     drew without wandering away from the points the coach actually placed. */
  function smoothPath(screenPts) {
    if (screenPts.length < 2) return '';
    if (screenPts.length === 2) {
      return 'M ' + screenPts[0].x + ' ' + screenPts[0].y +
             ' L ' + screenPts[1].x + ' ' + screenPts[1].y;
    }
    var d = 'M ' + screenPts[0].x + ' ' + screenPts[0].y;
    for (var i = 1; i < screenPts.length - 1; i++) {
      var mx = (screenPts[i].x + screenPts[i + 1].x) / 2;
      var my = (screenPts[i].y + screenPts[i + 1].y) / 2;
      d += ' Q ' + screenPts[i].x + ' ' + screenPts[i].y + ' ' + mx + ' ' + my;
    }
    var last = screenPts[screenPts.length - 1];
    d += ' L ' + last.x + ' ' + last.y;
    return d;
  }

  function drawRoute(ctx, points, opts) {
    opts = opts || {};
    if (!points || points.length < 2) return null;

    var los = opts.lineOfScrimmageYard;
    var pts = points.map(function (p) {
      return { x: ctx.ux(p.xYards), y: ctx.uy(ctx.absY(p.yYards, los)) };
    });

    var g = el('g', {
      'class': 'ff-route' + (opts.className ? ' ' + opts.className : ''),
      'data-position': opts.positionId || '',
      opacity: opts.opacity === undefined ? 1 : opts.opacity
    }, opts.layer || ctx.layers.routes);

    var core = opts.color || '#FFFFFF';
    var halo = opts.halo || '#12331A';
    var w = opts.width || 0.28;
    var d = smoothPath(pts);

    el('path', { d: d, fill: 'none', stroke: halo, 'stroke-width': w + 0.16,
                 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    el('path', { d: d, fill: 'none', stroke: core, 'stroke-width': w,
                 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
                 'stroke-dasharray': opts.dash || 'none' }, g);

    /* Arrowhead, aimed along the last stretch that actually has direction. */
    if (opts.arrow !== false) {
      var tip = pts[pts.length - 1], prev = null;
      for (var i = pts.length - 2; i >= 0; i--) {
        var dx0 = tip.x - pts[i].x, dy0 = tip.y - pts[i].y;
        if (Math.sqrt(dx0 * dx0 + dy0 * dy0) > 0.3) { prev = pts[i]; break; }
      }
      if (prev) {
        var ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
        var len = 1.0, spread = 0.42;
        var p1 = [tip.x - len * Math.cos(ang - spread), tip.y - len * Math.sin(ang - spread)];
        var p2 = [tip.x - len * Math.cos(ang + spread), tip.y - len * Math.sin(ang + spread)];
        var tri = tip.x + ',' + tip.y + ' ' + p1.join(',') + ' ' + p2.join(',');
        el('polygon', { points: tri, fill: halo, stroke: halo,
                        'stroke-width': 0.16, 'stroke-linejoin': 'round' }, g);
        el('polygon', { points: tri, fill: core }, g);
      }
    }
    return g;
  }

  /* ------------------------------------------------------------------------
     Zone bubbles. A defender in zone coverage owns an area, not a path, so a
     route line is the wrong picture entirely - a soft blob around them says
     "this is your space" in a way a 9-year-old reads instantly.

     Drawn slightly wider than tall, and deliberately soft-edged: a zone is a
     rough area of responsibility, not a line anyone is standing on.
     ---------------------------------------------------------------------- */
  var ZONE_DEFAULTS = { RUSH: 0, LU: 6, RU: 6, LD: 9, RD: 9 };

  function zoneRadiusFor(player) {
    if (player && typeof player.zoneRadiusYards === 'number') {
      return player.zoneRadiusYards;
    }
    var byPosition = ZONE_DEFAULTS[player && player.positionId];
    return byPosition === undefined ? 6 : byPosition;
  }

  /* COBRA: the rusher drops out instead of rushing and plays the deep middle.
     Wide enough to overlap the two deep halves on either side, but nowhere
     near the sidelines - those belong to LD and RD, and a rover chasing them
     would be covering ground nobody asked him to cover.

     Offsets are in yards from wherever he lines up. */
  /* dy equals ry on purpose: the near edge of the zone sits exactly where he
     lines up, so he covers his own spot and everything behind it, rather than
     a band floating downfield of him. */
  var COBRA_LOBES = [
    { dx: 0, dy: 4.5, rx: 7.5, ry: 4.5 }
  ];

  function drawZone(ctx, o) {
    var lobes = o.lobes;

    if (!lobes) {
      var r = o.radiusYards;
      if (!r || r <= 0) return null;
      lobes = [{ dx: 0, dy: 0, rx: r, ry: r * 0.82 }];
    }

    /* Opacity is applied to the GROUP, not to each shape. Otherwise the lobes
       would compound where they overlap and the rover zone would come out
       blotchy instead of reading as one area. */
    var g = el('g', {
      'class': 'ff-zone' + (lobes.length > 1 ? ' is-rover' : ''),
      'data-position': o.positionId || '',
      opacity: o.fillOpacity === undefined ? 0.24 : o.fillOpacity
    }, o.layer || ctx.layers.routes);

    var single = lobes.length === 1;
    lobes.forEach(function (lobe) {
      el('ellipse', {
        cx: ctx.ux(o.xYards + lobe.dx),
        cy: ctx.uy(o.absY + lobe.dy),
        rx: lobe.rx,
        ry: lobe.ry,
        fill: COLOR.zone,
        stroke: single ? COLOR.zoneEdge : 'none',
        'stroke-width': single ? 0.2 : 0,
        'stroke-dasharray': single ? '1.1 0.7' : 'none'
      }, g);
    });

    return g;
  }

  /* The ball: a small brown oval, near life size. Detail like laces would be
     sub-pixel at this scale, so it is left off deliberately. */
  function drawBall(ctx, o) {
    var r = o.scale || 1;
    var g = el('g', {
      'class': 'ff-ball',
      transform: 'translate(' + ctx.ux(o.xYards) + ' ' + ctx.uy(o.absY) + ')'
        + ' rotate(' + (o.rotate === undefined ? -24 : o.rotate) + ')'
        + ' scale(' + r + ')'
    }, o.layer || ctx.layers.overlay);

    el('path', {
      d: 'M -0.32 0 Q 0 -0.20 0.32 0 Q 0 0.20 -0.32 0 Z',
      fill: COLOR.ball, stroke: '#2A1505', 'stroke-width': 0.06,
      'stroke-linejoin': 'round'
    }, g);
    return g;
  }

  /* Draw a whole play's 5 players at their pre-snap start positions. */
  function drawStartPositions(ctx, play, opts) {
    opts = opts || {};
    (play.players || []).forEach(function (p) {
      drawToken(ctx, {
        side: play.side,
        positionId: p.positionId,
        xYards: p.start.xYards,
        absY: ctx.absY(p.start.yYards, play.lineOfScrimmageYard),
        label: opts.labelFor ? opts.labelFor(p) : p.positionId,
        scale: opts.scale
      });
    });
  }

  FF.field = {
    render: render,
    drawToken: drawToken,
    drawRoute: drawRoute,
    drawBall: drawBall,
    drawZone: drawZone,
    zoneRadiusFor: zoneRadiusFor,
    ZONE_DEFAULTS: ZONE_DEFAULTS,
    COBRA_LOBES: COBRA_LOBES,
    drawStartPositions: drawStartPositions,
    viewForPlay: viewForPlay,
    fullView: fullView,
    viewForThumb: viewForThumb,
    totalLength: totalLength,
    absY: absY,
    COLOR: COLOR,
    el: el
  };
})(window.FF = window.FF || {});
