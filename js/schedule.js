/* ============================================================================
   Schedule - practices and games, this week's lineup, and a minute-by-minute
   itinerary you can print and carry to the field.

   Two views on one page:
     schedule.html            the list of events
     schedule.html?id=<id>    one event, in full

   The weekly lineup lives here rather than on each play (see the build
   decision): set who is playing C/QB/X/Y/Z once for the week and every play
   in the site labels itself with those names.
   ========================================================================== */
(function (FF) {
  'use strict';

  var saveStateEl, rootEl;
  var saveTimer = null;

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }
  function qs(name) { return new URLSearchParams(location.search).get(name); }

  /* ---------- time ------------------------------------------------------- */

  function toMinutes(hhmm) {
    var p = String(hhmm || '00:00').split(':');
    return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
  }

  function clockLabel(minutes) {
    var m = ((minutes % 1440) + 1440) % 1440;
    var hh = Math.floor(m / 60), mm = m % 60;
    var ap = hh >= 12 ? 'pm' : 'am';
    hh = hh % 12 || 12;
    return hh + ':' + String(mm).padStart(2, '0') + ap;
  }

  function dateLabel(iso) {
    if (!iso) return 'No date';
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(undefined,
      { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  /* ---------- saving ----------------------------------------------------- */

  function flagSaved(msg) {
    if (!saveStateEl) return;
    saveStateEl.textContent = msg || 'Saved';
    saveStateEl.classList.add('is-on');
    clearTimeout(flagSaved._t);
    flagSaved._t = setTimeout(function () { saveStateEl.classList.remove('is-on'); }, 1500);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    FF.store.save();
    FF.ui.refreshBanner();
    flagSaved();
  }

  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  /* ---------- helpers ---------------------------------------------------- */

  /* Offense and defense position ids never collide (C/QB/X/Y/Z vs
     RUSH/LU/RU/LD/RD), so one lineup map holds both sides. */
  function positionIds(side) {
    var key = side === 'defense' ? 'defensePositions' : 'offensePositions';
    return (FF.store.settings()[key] || []).map(function (p) { return p.id; });
  }

  function allPositionIds() {
    return positionIds('offense').concat(positionIds('defense'));
  }

  function availableRoster(evt) {
    var out = evt.unavailableRosterPlayerIds || [];
    return FF.store.roster().filter(function (p) { return out.indexOf(p.id) === -1; });
  }

  function playerLabel(p) {
    return p.jersey ? '#' + p.jersey + '  ' + (p.name || '') : (p.name || 'Unnamed');
  }

  function totalMinutes(evt) {
    return (evt.itinerary || []).reduce(function (sum, b) {
      return sum + (parseInt(b.durationMinutes, 10) || 0);
    }, 0);
  }

  /* ---------- list view --------------------------------------------------- */

  function eventSummary(evt) {
    var caps = (evt.captainRosterPlayerIds || [])
      .map(function (id) { var p = FF.store.playerById(id); return p ? p.name : null; })
      .filter(Boolean);
    var bits = [evt.location || 'Location TBD'];
    if (evt.type === 'game' && evt.opponent) bits.push('vs ' + evt.opponent);
    if (caps.length) bits.push('Captains: ' + caps.join(' & '));
    var mins = totalMinutes(evt);
    if (mins) bits.push(mins + ' min');
    return bits.join(' · ');
  }

  function renderList() {
    rootEl.innerHTML = '';
    var today = todayISO();
    var all = FF.store.eventsSorted();
    var upcoming = all.filter(function (e) { return e.date >= today; });
    var past = all.filter(function (e) { return e.date < today; }).reverse();

    var head = h('section', { 'class': 'ff-card' }, [
      h('div', { 'class': 'ff-card-head' }, [
        h('h1', { text: 'Schedule' }),
        h('span', { 'class': 'ff-pill',
          text: upcoming.length + ' upcoming' })
      ])
    ]);

    var tools = h('div', { 'class': 'ff-toolbar' });
    if (FF.ui.isCoach()) [['practice', '+ Practice'], ['game', '+ Game']].forEach(function (t) {
      var b = h('button', { type: 'button',
        'class': 'ff-btn' + (t[0] === 'game' ? ' secondary' : ''), text: t[1] });
      b.addEventListener('click', function () { createEvent(t[0]); });
      tools.appendChild(b);
    });
    head.appendChild(tools);
    rootEl.appendChild(head);

    rootEl.appendChild(listBlock('Upcoming', upcoming,
      'Nothing scheduled yet. Add a practice or a game above.'));
    if (past.length) rootEl.appendChild(listBlock('Past', past, ''));
    rootEl.appendChild(renderRules());
  }

  /* ---------- league rules -------------------------------------------------
     The full rules are a PDF nobody reads on a sideline. These are the ones
     that actually come up during a game, pulled out where they can be found
     in a hurry, with the document behind them for everything else. */

  var RULE_GROUPS = [
    ['The game', [
      '5 on 5',
      'Two 20-minute halves',
      '30-second play clock',
      'Every player plays at least half',
      'One 30-second and one 60-second timeout per half',
      'Play with one fewer if you are short'
    ]],
    ['Offense', [
      'Start at your own 5-yard line',
      '4 plays to cross midfield, then 4 to score',
      'The quarterback cannot run the ball',
      'Everyone is an eligible receiver',
      'One player in motion, never forward at the snap',
      'Once the ball crosses the line, everyone else stops',
      'Laterals and pitches only behind the line',
      'No fumbles — the ball is spotted where it lands'
    ]],
    ['Defense', [
      'Rushers start at least 7 yards off the ball',
      'Any number may rush',
      'Others may hold the line but not cross until the handoff',
      'No blitzing when ahead by more than 21',
      'Interceptions can be returned'
    ]],
    ['Scoring', [
      'Touchdown — 6',
      'Extra point from the 5 — 1, pass only',
      'Extra point from the 12 — 2, run or pass',
      'Safety — 2'
    ]],
    ['Gear', [
      'Mouthguards required, no exceptions',
      'No metal cleats',
      'Belts tucked in'
    ]]
  ];

  function renderRules() {
    var card = h('section', { 'class': 'ff-card ff-rules' });

    card.appendChild(h('div', { 'class': 'ff-card-head' }, [
      h('h2', { text: 'League rules' }),
      h('span', { 'class': 'ff-small ff-muted', text: 'Omaha Suburban (OSAA)' })
    ]));

    var grid = h('div', { 'class': 'ff-rules-grid' });
    RULE_GROUPS.forEach(function (group) {
      var col = h('div', { 'class': 'ff-rules-group' }, [
        h('div', { 'class': 'ff-rules-head', text: group[0] })
      ]);
      var ul = h('ul', { 'class': 'ff-rules-list' });
      group[1].forEach(function (rule) {
        ul.appendChild(h('li', { text: rule }));
      });
      col.appendChild(ul);
      grid.appendChild(col);
    });
    card.appendChild(grid);

    card.appendChild(h('div', { 'class': 'ff-toolbar', style: 'margin-top:16px' }, [
      h('a', { 'class': 'ff-btn', href: 'rules/osaa-flag-rules.pdf',
        target: '_blank', rel: 'noopener',
        text: '📄 Open the full rules' }),
      h('span', { 'class': 'ff-small ff-muted',
        text: 'OSAA flag football, updated July 2018' })
    ]));

    return card;
  }

  function listBlock(title, events, emptyText) {
    var card = h('section', { 'class': 'ff-card' }, [h('h2', { text: title })]);
    if (!events.length) {
      card.appendChild(h('p', { 'class': 'ff-muted ff-small', text: emptyText }));
      return card;
    }
    var ul = h('ul', { 'class': 'ff-list' });
    events.forEach(function (evt) {
      var li = h('li', {}, [
        h('div', {}, [
          h('div', { 'class': 'ff-evt-title' }, [
            h('span', { 'class': 'ff-pill' + (evt.type === 'game' ? ' is-game' : ''),
              text: evt.type === 'game' ? 'Game' : 'Practice' }),
            h('strong', { text: dateLabel(evt.date) }),
            h('span', { 'class': 'ff-muted', text: clockLabel(toMinutes(evt.startTime)) })
          ]),
          h('div', { 'class': 'ff-small ff-muted', text: eventSummary(evt) })
        ]),
        h('a', { 'class': 'ff-btn secondary ff-small',
          href: 'schedule.html?id=' + evt.id, text: 'Open' })
      ]);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    return card;
  }

  function createEvent(type) {
    var created;
    FF.store.update(function (d) {
      var lineup = {};
      allPositionIds().forEach(function (id) { lineup[id] = []; });
      created = {
        id: FF.store.uuid(),
        type: type,
        date: todayISO(),
        startTime: type === 'game' ? '10:00' : '17:30',
        location: '',
        opponent: '',
        captainRosterPlayerIds: [],
        unavailableRosterPlayerIds: [],
        lineup: lineup,
        itinerary: []
      };
      d.practices.push(created);
    });
    FF.ui.refreshBanner();
    location.href = 'schedule.html?id=' + created.id;
  }

  /* ---------- event view -------------------------------------------------- */

  /* ---------- read-only event, for parents ---------------------------------
     Same information, no controls: nothing to change, nothing to delete, and
     no chance of a tap turning into an edit. */

  function renderEventReadOnly(evt) {
    rootEl.innerHTML = '';

    var card = h('section', { 'class': 'ff-card' });
    card.appendChild(h('div', { 'class': 'ff-card-head' }, [
      h('a', { 'class': 'ff-small', href: 'schedule.html', text: '← All events' }),
      h('span', { 'class': 'ff-pill' + (evt.type === 'game' ? ' is-game' : ''),
        text: evt.type === 'game' ? 'Game' : 'Practice' })
    ]));
    card.appendChild(h('h1', { text: dateLabel(evt.date) }));
    card.appendChild(h('p', {
      text: clockLabel(toMinutes(evt.startTime))
        + (evt.location ? ' · ' + evt.location : '')
        + (evt.type === 'game' && evt.opponent ? ' · vs ' + evt.opponent : '')
    }));

    var caps = (evt.captainRosterPlayerIds || [])
      .map(function (id) { var p = FF.store.playerById(id); return p ? p.name : null; })
      .filter(Boolean);
    if (caps.length) {
      card.appendChild(h('p', {}, [
        h('strong', { text: 'Captains: ' }),
        h('span', { text: caps.join(' & ') })
      ]));
    }
    rootEl.appendChild(card);

    ['offense', 'defense'].forEach(function (side) {
      var ids = positionIds(side);
      var anyone = ids.some(function (pos) {
        return FF.store.lineupList(evt, pos).filter(Boolean).length > 0;
      });
      if (!anyone) return;

      var groups = FF.store.LINEUP_GROUPS(side);
      var block = h('section', { 'class': 'ff-card' }, [
        h('h2', { text: side === 'defense' ? 'Defense' : 'Offense' })
      ]);

      ids.forEach(function (pos) {
        var list = FF.store.lineupList(evt, pos);
        var names = [];
        for (var g = 0; g < groups; g++) {
          var p = FF.store.playerById(list[g]);
          if (p) names.push(p.name);
        }
        if (!names.length) return;
        block.appendChild(h('div', { 'class': 'ff-depth-row is-readonly' }, [
          h('span', { 'class': 'ff-pill', text: pos }),
          h('span', { text: names.join(', ') })
        ]));
      });
      rootEl.appendChild(block);
    });

    if ((evt.itinerary || []).length) {
      var plan = h('section', { 'class': 'ff-card' }, [
        h('div', { 'class': 'ff-card-head' }, [
          h('h2', { text: 'Plan' }),
          h('span', { 'class': 'ff-small ff-muted',
            text: totalMinutes(evt) + ' min · ends '
              + clockLabel(toMinutes(evt.startTime) + totalMinutes(evt)) })
        ])
      ]);

      var running = toMinutes(evt.startTime);
      evt.itinerary.forEach(function (b) {
        var mins = parseInt(b.durationMinutes, 10) || 0;
        var row = h('div', { 'class': 'ff-itin is-readonly' }, [
          h('div', { 'class': 'ff-itin-time' }, [
            h('strong', { text: clockLabel(running) }),
            h('span', { 'class': 'ff-small ff-muted', text: clockLabel(running + mins) })
          ])
        ]);
        var body = h('div', { 'class': 'ff-itin-body' }, [
          h('strong', { text: b.label || 'Block' })
        ]);
        if (b.notes) body.appendChild(h('div', { 'class': 'ff-small ff-muted', text: b.notes }));
        if (b.linkedPlayId && FF.store.playById(b.linkedPlayId)) {
          body.appendChild(h('a', { 'class': 'ff-btn secondary ff-small',
            href: 'play-viewer.html?id=' + b.linkedPlayId,
            text: 'View ' + FF.store.playById(b.linkedPlayId).name }));
        }
        if (b.linkedDrillId && FF.drills && FF.drills.byId(b.linkedDrillId)) {
          body.appendChild(h('a', { 'class': 'ff-btn secondary ff-small',
            href: 'play-viewer.html?drill=' + b.linkedDrillId,
            text: 'Drill: ' + FF.drills.byId(b.linkedDrillId).name }));
        }
        row.appendChild(body);
        plan.appendChild(row);
        running += mins;
      });
      rootEl.appendChild(plan);
    }

    rootEl.appendChild(renderPrintSheet(evt));

    var footer = h('section', { 'class': 'ff-card' });
    var print = h('button', { type: 'button', 'class': 'ff-btn', text: '🖨 Print' });
    print.addEventListener('click', function () { window.print(); });
    footer.appendChild(h('div', { 'class': 'ff-toolbar' }, [print]));
    rootEl.appendChild(footer);
  }

  function renderEvent(evt) {
    if (!FF.ui.isCoach()) { renderEventReadOnly(evt); return; }
    rootEl.innerHTML = '';

    /* --- details --- */
    var card = h('section', { 'class': 'ff-card' });
    card.appendChild(h('div', { 'class': 'ff-card-head' }, [
      h('a', { 'class': 'ff-small', href: 'schedule.html', text: '← All events' }),
      h('span', { 'class': 'ff-pill' + (evt.type === 'game' ? ' is-game' : ''),
        text: evt.type === 'game' ? 'Game' : 'Practice' })
    ]));

    var grid = h('div', { 'class': 'ff-formgrid' });

    var typeSel = h('select', { 'aria-label': 'Type' });
    [['practice', 'Practice'], ['game', 'Game']].forEach(function (t) {
      var o = h('option', { value: t[0], text: t[1] });
      if (evt.type === t[0]) o.selected = true;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener('change', function () {
      evt.type = typeSel.value; saveNow(); renderEvent(evt);
    });
    grid.appendChild(labelled('Type', typeSel));

    var date = h('input', { type: 'date', value: evt.date || todayISO() });
    date.addEventListener('change', function () { evt.date = date.value; saveNow(); });
    grid.appendChild(labelled('Date', date));

    var time = h('input', { type: 'time', value: evt.startTime || '17:30' });
    time.addEventListener('change', function () {
      evt.startTime = time.value; saveNow(); renderEvent(evt);
    });
    grid.appendChild(labelled('Start time', time));

    var loc = h('input', { type: 'text', value: evt.location || '',
      placeholder: 'Field / address' });
    loc.addEventListener('input', function () { evt.location = loc.value; saveSoon(); });
    grid.appendChild(labelled('Location', loc));

    if (evt.type === 'game') {
      var opp = h('input', { type: 'text', value: evt.opponent || '',
        placeholder: 'Opponent' });
      opp.addEventListener('input', function () { evt.opponent = opp.value; saveSoon(); });
      grid.appendChild(labelled('Opponent', opp));
    }

    card.appendChild(grid);
    rootEl.appendChild(card);

    /* --- who is here --- */
    rootEl.appendChild(renderAvailability(evt));
    rootEl.appendChild(renderLineup(evt, "offense"));
    rootEl.appendChild(renderLineup(evt, "defense"));
    rootEl.appendChild(renderItinerary(evt));
    rootEl.appendChild(renderPrintSheet(evt));
    rootEl.appendChild(renderFooter(evt));
  }

  function labelled(text, control) {
    var wrap = h('div', { 'class': 'ff-formfield' });
    wrap.appendChild(h('label', { 'class': 'ff-field-label', text: text }));
    wrap.appendChild(control);
    return wrap;
  }

  /* --- availability + captains --- */

  function renderAvailability(evt) {
    var card = h('section', { 'class': 'ff-card' }, [
      h('h2', { text: 'This week' })
    ]);

    /* Captains */
    var capWrap = h('div', { 'class': 'ff-formgrid' });
    [0, 1].forEach(function (slot) {
      var sel = h('select', { 'aria-label': 'Captain ' + (slot + 1) });
      sel.appendChild(h('option', { value: '', text: '— none —' }));
      availableRoster(evt).forEach(function (p) {
        /* The other captain cannot be picked twice. */
        var otherId = (evt.captainRosterPlayerIds || [])[1 - slot];
        if (p.id === otherId) return;
        var o = h('option', { value: p.id, text: playerLabel(p) });
        if ((evt.captainRosterPlayerIds || [])[slot] === p.id) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var caps = (evt.captainRosterPlayerIds || []).slice();
        caps[slot] = sel.value || null;
        /* Keep both slots, nulls and all, so clearing captain 1 does not
           silently promote captain 2 into their place. Readers filter. */
        evt.captainRosterPlayerIds = [caps[0] || null, caps[1] || null];
        saveNow();
        renderEvent(evt);
      });
      capWrap.appendChild(labelled('Captain ' + (slot + 1), sel));
    });
    card.appendChild(capWrap);

    /* Availability */
    card.appendChild(h('div', { 'class': 'ff-field-label', text: 'Out this week' }));
    card.appendChild(h('p', { 'class': 'ff-small ff-muted',
      text: 'Anyone marked out disappears from the captain and lineup pickers.' }));

    var checks = h('div', { 'class': 'ff-checks' });
    FF.store.roster().forEach(function (p) {
      var out = (evt.unavailableRosterPlayerIds || []).indexOf(p.id) !== -1;
      var box = h('input', { type: 'checkbox', id: 'out-' + p.id });
      box.checked = out;
      box.addEventListener('change', function () {
        var list = (evt.unavailableRosterPlayerIds || []).slice();
        if (box.checked) {
          if (list.indexOf(p.id) === -1) list.push(p.id);
          /* Someone who is out cannot still be holding a job this week. */
          Object.keys(evt.lineup || {}).forEach(function (pos) {
            evt.lineup[pos] = (evt.lineup[pos] || []).map(function (id) {
              return id === p.id ? null : id;
            });
          });
          evt.captainRosterPlayerIds = (evt.captainRosterPlayerIds || [])
            .filter(function (id) { return id !== p.id; });
        } else {
          list = list.filter(function (id) { return id !== p.id; });
        }
        evt.unavailableRosterPlayerIds = list;
        saveNow();
        renderEvent(evt);
      });
      var lab = h('label', { 'class': 'ff-check' + (out ? ' is-out' : ''), for: box.id });
      lab.appendChild(box);
      lab.appendChild(h('span', { text: p.name || 'Unnamed' }));
      checks.appendChild(lab);
    });
    if (!FF.store.roster().length) {
      checks.appendChild(h('span', { 'class': 'ff-small ff-muted',
        text: 'No players on the roster yet.' }));
    }
    card.appendChild(checks);

    /* Copy from the previous event - most weeks the lineup barely moves.
       Brings both sides of the lineup plus the captains. */
    var prev = previousEvent(evt);
    if (prev) {
      var copy = h('button', { type: 'button', 'class': 'ff-btn secondary ff-small',
        text: 'Copy lineups & captains from ' + dateLabel(prev.date) });
      copy.addEventListener('click', function () {
        evt.lineup = JSON.parse(JSON.stringify(prev.lineup || {}));
        var out = evt.unavailableRosterPlayerIds || [];
        /* Never copy someone in who is out this week. */
        Object.keys(evt.lineup).forEach(function (pos) {
          evt.lineup[pos] = (evt.lineup[pos] || []).map(function (id) {
            return out.indexOf(id) !== -1 ? null : id;
          });
        });
        evt.captainRosterPlayerIds = (prev.captainRosterPlayerIds || [])
          .map(function (id) { return out.indexOf(id) !== -1 ? null : id; });
        saveNow();
        renderEvent(evt);
      });
      card.appendChild(h('div', { 'class': 'ff-toolbar ff-tight',
        style: 'margin-top:12px' }, [copy]));
    }
    return card;
  }

  /* --- weekly lineup --- */

  function renderLineup(evt, side) {
    var isDef = side === 'defense';
    var card = h('section', { 'class': 'ff-card' }, [
      h('div', { 'class': 'ff-card-head' }, [
        h('h2', { text: isDef ? 'Defense lineup' : 'Offense lineup' }),
        h('span', { 'class': 'ff-small ff-muted',
          text: isDef ? 'Used by defensive plays' : 'Used by offensive plays' })
      ]),
      h('p', { 'class': 'ff-small ff-muted',
        text: 'Set who plays each spot this week. Switch the play viewer to '
            + 'Numbers or Names and the kids will see themselves on the field.' })
    ]);

    /* Group 1 starts at a spot; the rest rotate through it. Offense runs four
       deep so every kid can cover two positions across a week. */
    var groups = FF.store.LINEUP_GROUPS(side);

    positionIds(side).forEach(function (pos) {
      var row = h('div', { 'class': 'ff-depth-row' }, [
        h('span', { 'class': 'ff-pill', text: pos })
      ]);
      var slots = h('div', { 'class': 'ff-depth-slots' });
      var list = FF.store.lineupList(evt, pos);

      for (var g = 0; g < groups; g++) {
        (function (slot) {
          var cell = h('div', { 'class': 'ff-depth-cell' }, [
            h('span', { 'class': 'ff-depth-num', text: String(slot + 1) })
          ]);
          var sel = h('select', { 'aria-label': pos + ' group ' + (slot + 1) });
          sel.appendChild(h('option', { value: '', text: '—' }));
          availableRoster(evt).forEach(function (p) {
            /* One kid cannot fill two groups of the SAME position - that spot
               would have no rotation behind them. */
            var heldElsewhereHere = list.some(function (id, i) {
              return i !== slot && id === p.id;
            });
            if (heldElsewhereHere) return;
            var o = h('option', { value: p.id, text: playerLabel(p) });
            if (list[slot] === p.id) o.selected = true;
            sel.appendChild(o);
          });
          sel.addEventListener('change', function () {
            evt.lineup = evt.lineup || {};
            var next = FF.store.lineupList(evt, pos).slice();
            while (next.length < groups) next.push(null);
            next[slot] = sel.value || null;
            evt.lineup[pos] = next;
            saveNow();
            renderEvent(evt);
          });
          cell.appendChild(sel);
          slots.appendChild(cell);
        })(g);
      }
      row.appendChild(slots);
      card.appendChild(row);
    });

    card.appendChild(lineupChecks(evt, side));
    return card;
  }

  /* The point of running two deep is that everybody plays, so what is worth
     flagging is a kid with no spot on this side, a kid carrying too many, and
     a spot with nobody behind the starter. Each side is judged on its own. */
  function lineupChecks(evt, side) {
    var wrap = h('div', { 'class': 'ff-depth-checks' });
    var sideName = side === 'defense' ? 'defense' : 'offense';
    var maxEach = 2;

    var here = positionIds(side);
    var sideLoad = {};
    here.forEach(function (pos) {
      FF.store.lineupList(evt, pos).forEach(function (id) {
        if (id) sideLoad[id] = (sideLoad[id] || 0) + 1;
      });
    });

    var unassigned = availableRoster(evt).filter(function (p) { return !sideLoad[p.id]; });
    var overloaded = availableRoster(evt).filter(function (p) { return sideLoad[p.id] > maxEach; });
    var thin = here.filter(function (pos) {
      return FF.store.lineupList(evt, pos).filter(Boolean).length < 2;
    });

    if (unassigned.length) {
      wrap.appendChild(h('p', { 'class': 'ff-note is-warn',
        text: 'Not playing ' + sideName + ' yet: '
          + unassigned.map(function (p) { return p.name || 'Unnamed'; }).join(', ') }));
    }
    if (overloaded.length) {
      wrap.appendChild(h('p', { 'class': 'ff-note is-warn',
        text: 'More than ' + maxEach + ' ' + sideName + ' spots: '
          + overloaded.map(function (p) {
              return (p.name || 'Unnamed') + ' (' + sideLoad[p.id] + ')';
            }).join(', ') }));
    }
    if (thin.length) {
      wrap.appendChild(h('p', { 'class': 'ff-note',
        text: 'Only one deep at: ' + thin.join(', ') }));
    }
    if (!wrap.children.length) {
      wrap.appendChild(h('p', { 'class': 'ff-note is-ok',
        text: 'Every available player has a ' + sideName
            + ' spot, and every spot runs two deep.' }));
    }
    return wrap;
  }

  function previousEvent(evt) {
    var sorted = FF.store.eventsSorted();
    var prev = null;
    sorted.forEach(function (e) {
      if (e.id !== evt.id && (e.date + e.startTime) <= (evt.date + evt.startTime)) prev = e;
    });
    return prev;
  }

  /* --- itinerary --- */

  function renderItinerary(evt) {
    var card = h('section', { 'class': 'ff-card ff-itin-card' }, [
      h('div', { 'class': 'ff-card-head' }, [
        h('h2', { text: 'Itinerary' }),
        h('span', { 'class': 'ff-small ff-muted',
          text: totalMinutes(evt)
            ? totalMinutes(evt) + ' min · ends ' +
              clockLabel(toMinutes(evt.startTime) + totalMinutes(evt))
            : '' })
      ])
    ]);

    var blocks = evt.itinerary || [];

    if (!blocks.length) {
      card.appendChild(h('p', { 'class': 'ff-small ff-muted',
        text: 'No blocks yet. Add one below — warm-up, play walkthrough, '
            + 'scrimmage, water break, whatever the night needs.' }));
    }

    var running = toMinutes(evt.startTime);
    blocks.forEach(function (block, i) {
      var startAt = running;
      var mins = parseInt(block.durationMinutes, 10) || 0;
      running += mins;
      card.appendChild(itineraryRow(evt, block, i, startAt, running));
    });

    var add = h('button', { type: 'button', 'class': 'ff-btn', text: '+ Add block' });
    add.addEventListener('click', function () {
      evt.itinerary = evt.itinerary || [];
      evt.itinerary.push({
        id: FF.store.uuid(), label: '', durationMinutes: 10,
        linkedPlayId: null, linkedDrillId: null, notes: ''
      });
      saveNow();
      renderEvent(evt);
    });
    card.appendChild(h('div', { 'class': 'ff-toolbar', style: 'margin-top:12px' }, [add]));
    return card;
  }

  function itineraryRow(evt, block, index, startAt, endAt) {
    var row = h('div', { 'class': 'ff-itin' });

    row.appendChild(h('div', { 'class': 'ff-itin-time' }, [
      h('strong', { text: clockLabel(startAt) }),
      h('span', { 'class': 'ff-small ff-muted', text: clockLabel(endAt) })
    ]));

    var body = h('div', { 'class': 'ff-itin-body' });

    var top = h('div', { 'class': 'ff-itin-top' });
    var label = h('input', { type: 'text', value: block.label || '',
      placeholder: 'What are we doing?', 'aria-label': 'Block name' });
    label.addEventListener('input', function () { block.label = label.value; saveSoon(); });

    var mins = h('input', { type: 'number', min: '1', max: '180',
      value: String(block.durationMinutes || 10), 'aria-label': 'Minutes',
      'class': 'ff-itin-mins' });
    mins.addEventListener('change', function () {
      block.durationMinutes = Math.max(1, parseInt(mins.value, 10) || 1);
      saveNow();
      renderEvent(evt);
    });

    top.appendChild(label);
    top.appendChild(mins);
    top.appendChild(h('span', { 'class': 'ff-small ff-muted', text: 'min' }));
    body.appendChild(top);

    /* Link a play, so whoever runs this block can pull the diagram up. */
    var linkRow = h('div', { 'class': 'ff-itin-link' });
    var sel = h('select', { 'aria-label': 'Linked play' });
    sel.appendChild(h('option', { value: '', text: '— no play linked —' }));
    FF.store.plays().forEach(function (p) {
      var o = h('option', { value: p.id,
        text: (p.side === 'offense' ? 'O' : 'D') + ' · ' + p.name });
      if (block.linkedPlayId === p.id) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      block.linkedPlayId = sel.value || null;
      saveNow();
      renderEvent(evt);
    });
    linkRow.appendChild(sel);
    if (block.linkedPlayId && FF.store.playById(block.linkedPlayId)) {
      linkRow.appendChild(h('a', { 'class': 'ff-btn secondary ff-small',
        href: 'play-viewer.html?id=' + block.linkedPlayId, text: 'View play' }));
    }
    body.appendChild(linkRow);

    var drillRow = h('div', { 'class': 'ff-itin-link' });
    var dsel = h('select', { 'aria-label': 'Linked drill' });
    dsel.appendChild(h('option', { value: '', text: '— no drill linked —' }));
    (FF.drills ? FF.drills.all() : []).forEach(function (d) {
      var o = h('option', { value: d.id, text: d.name });
      if (block.linkedDrillId === d.id) o.selected = true;
      dsel.appendChild(o);
    });
    dsel.addEventListener('change', function () {
      block.linkedDrillId = dsel.value || null;
      saveNow();
      renderEvent(evt);
    });
    drillRow.appendChild(dsel);
    if (block.linkedDrillId && FF.drills && FF.drills.byId(block.linkedDrillId)) {
      drillRow.appendChild(h('a', { 'class': 'ff-btn secondary ff-small',
        href: 'play-viewer.html?drill=' + block.linkedDrillId, text: 'View drill' }));
    }
    body.appendChild(drillRow);

    var notes = h('input', { type: 'text', value: block.notes || '',
      placeholder: 'Notes for whoever runs this', 'aria-label': 'Notes' });
    notes.addEventListener('input', function () { block.notes = notes.value; saveSoon(); });
    body.appendChild(notes);

    row.appendChild(body);

    var tools = h('div', { 'class': 'ff-itin-tools' });
    var up = h('button', { type: 'button', 'class': 'ff-row-del', text: '↑',
      title: 'Move earlier' });
    up.disabled = index === 0;
    up.addEventListener('click', function () { moveBlock(evt, index, -1); });

    var down = h('button', { type: 'button', 'class': 'ff-row-del', text: '↓',
      title: 'Move later' });
    down.disabled = index === (evt.itinerary.length - 1);
    down.addEventListener('click', function () { moveBlock(evt, index, 1); });

    var del = h('button', { type: 'button', 'class': 'ff-row-del', text: '×',
      title: 'Remove this block' });
    del.addEventListener('click', function () {
      if (!window.confirm('Remove "' + (block.label || 'this block') + '"?')) return;
      evt.itinerary.splice(index, 1);
      saveNow();
      renderEvent(evt);
    });

    tools.appendChild(up);
    tools.appendChild(down);
    tools.appendChild(del);
    row.appendChild(tools);
    return row;
  }

  function moveBlock(evt, index, delta) {
    var to = index + delta;
    if (to < 0 || to >= evt.itinerary.length) return;
    var item = evt.itinerary.splice(index, 1)[0];
    evt.itinerary.splice(to, 0, item);
    saveNow();
    renderEvent(evt);
  }

  /* --- the paper version -------------------------------------------------
     Printing the form itself would put input boxes on paper. This is a plain
     rendering of the same data, hidden on screen and shown only in print. */

  function renderPrintSheet(evt) {
    var sheet = h('section', { 'class': 'ff-printonly' });
    var t = FF.store.team();

    sheet.appendChild(h('h1', { text: t.name + ' — '
      + (evt.type === 'game' ? 'Game' : 'Practice') }));
    sheet.appendChild(h('p', { text: dateLabel(evt.date) + ' · '
      + clockLabel(toMinutes(evt.startTime))
      + (evt.location ? ' · ' + evt.location : '')
      + (evt.type === 'game' && evt.opponent ? ' · vs ' + evt.opponent : '') }));

    var caps = (evt.captainRosterPlayerIds || [])
      .map(function (id) { var p = FF.store.playerById(id); return p ? p.name : null; })
      .filter(Boolean);
    if (caps.length) {
      sheet.appendChild(h('p', { text: 'Captains: ' + caps.join(' & ') }));
    }

    ['offense', 'defense'].forEach(function (side) {
      var groups = FF.store.LINEUP_GROUPS(side);
      var table = h('table', { 'class': 'ff-printtable' });
      var head = [h('th', { text: side === 'defense' ? 'Defense' : 'Offense' })];
      for (var g = 0; g < groups; g++) head.push(h('th', { text: String(g + 1) }));
      table.appendChild(h('tr', {}, head));

      positionIds(side).forEach(function (pos) {
        var list = FF.store.lineupList(evt, pos);
        var cells = [h('td', { text: pos })];
        for (var g2 = 0; g2 < groups; g2++) {
          cells.push(h('td', {
            text: (FF.store.playerById(list[g2]) || {}).name || '—'
          }));
        }
        table.appendChild(h('tr', {}, cells));
      });
      sheet.appendChild(table);
    });

    var out = (evt.unavailableRosterPlayerIds || [])
      .map(function (id) { var p = FF.store.playerById(id); return p ? p.name : null; })
      .filter(Boolean);
    if (out.length) sheet.appendChild(h('p', { text: 'Out: ' + out.join(', ') }));

    var table = h('table', { 'class': 'ff-printtable' });
    var thead = h('tr', {}, [
      h('th', { text: 'Time' }), h('th', { text: 'Min' }),
      h('th', { text: 'What' }), h('th', { text: 'Notes' })
    ]);
    table.appendChild(thead);

    var running = toMinutes(evt.startTime);
    (evt.itinerary || []).forEach(function (b) {
      var mins = parseInt(b.durationMinutes, 10) || 0;
      var linked = b.linkedPlayId ? FF.store.playById(b.linkedPlayId) : null;
      table.appendChild(h('tr', {}, [
        h('td', { text: clockLabel(running) }),
        h('td', { text: String(mins) }),
        h('td', { text: (b.label || '—') + (linked ? '  [' + linked.name + ']' : '') }),
        h('td', { text: b.notes || '' })
      ]));
      running += mins;
    });
    sheet.appendChild(table);
    sheet.appendChild(h('p', { text: 'Ends ' + clockLabel(running)
      + ' · ' + totalMinutes(evt) + ' minutes total' }));
    return sheet;
  }

  function renderFooter(evt) {
    var card = h('section', { 'class': 'ff-card' });
    var tools = h('div', { 'class': 'ff-toolbar' });

    var print = h('button', { type: 'button', 'class': 'ff-btn', text: '🖨 Print itinerary' });
    print.addEventListener('click', function () { window.print(); });

    var del = h('button', { type: 'button', 'class': 'ff-btn danger', text: 'Delete event' });
    del.addEventListener('click', function () {
      if (!window.confirm('Delete this ' + evt.type + '? This cannot be undone.')) return;
      FF.store.update(function (d) {
        d.practices = d.practices.filter(function (e) { return e.id !== evt.id; });
      });
      location.href = 'schedule.html';
    });

    tools.appendChild(print);
    tools.appendChild(del);
    card.appendChild(tools);
    return card;
  }

  /* ---------- boot -------------------------------------------------------- */

  function init() {
    FF.ui.init();
    rootEl = document.getElementById("root");
    saveStateEl = document.getElementById("saveState");

    var id = qs('id');
    var evt = id ? FF.store.eventById(id) : null;

    if (id && !evt) {
      rootEl.innerHTML = '<section class="ff-card"><div class="ff-stub">'
        + '<p>That event could not be found.</p>'
        + '<p><a class="ff-btn" href="schedule.html">Back to Schedule</a></p></div></section>';
      return;
    }

    if (evt) renderEvent(evt); else renderList();

    window.addEventListener('beforeunload', function () {
      if (saveTimer) { clearTimeout(saveTimer); FF.store.save(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.FF = window.FF || {});
