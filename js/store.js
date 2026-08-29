/* ============================================================================
   FF.store - the single source of truth for all team data.

   Load order (see spec section 10, "Publish by export"):
     1. If the coach has local edits in this browser -> use those (working copy).
     2. Otherwise -> use the published data baked into data/team-data.js.

   Every mutation autosaves to localStorage immediately. Nothing is ever sent
   anywhere; there is no server.
   ========================================================================== */
(function (FF) {
  'use strict';

  var LS_KEY = 'ff.teamData.v1';

  var state = null;            // the live working copy
  var loadedFromLocal = false;

  /* ---------- small helpers ---------------------------------------------- */

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  /* Fill in any keys the saved copy is missing, so data saved by an older
     version of the site still works after we ship new settings. Existing
     values are always left alone - defaults never overwrite. */
  function backfill(target, defaults) {
    Object.keys(defaults).forEach(function (k) {
      if (!(k in target) || target[k] === null || target[k] === undefined) {
        target[k] = (isPlainObject(defaults[k]) || Array.isArray(defaults[k]))
          ? clone(defaults[k])
          : defaults[k];
      } else if (isPlainObject(target[k]) && isPlainObject(defaults[k])) {
        backfill(target[k], defaults[k]);
      }
    });
    return target;
  }

  /* ---------- migrations --------------------------------------------------
     backfill() only ever ADDS missing keys - it will not change a value the
     coach's browser already holds. So when a shipped default turns out to be
     wrong, it takes a migration to correct an existing working copy.
     Each step is keyed to schemaVersion and runs at most once.
     ---------------------------------------------------------------------- */
  function migrate(d) {
    var from = d.schemaVersion || 1;

    /* v2: X can take a handoff. The original list was Y and Z only, which
       blocked a jet sweep to X out of Spread. */
    if (from < 2) {
      var handoff = d.settings.handoffEligiblePositions || ['Y', 'Z'];
      if (handoff.indexOf('X') === -1) handoff.unshift('X');
      d.settings.handoffEligiblePositions = handoff;
    }

    /* v3: the roster lost its free-text notes column. Anyone whose name ended
       up in that field instead keeps it - the name is the thing that matters,
       and silently dropping the column would have thrown those away. */
    if (from < 3) {
      (d.roster || []).forEach(function (p) {
        if (!String(p.name || '').trim() && String(p.notes || '').trim()) {
          p.name = String(p.notes).trim();
        }
        delete p.notes;
      });
    }

    /* v4: drills are gone. The coach builds practice itineraries directly, so
       a separate reusable drill catalog was one layer nobody needed. */
    if (from < 4) {
      delete d.drills;
      if (d.settings) delete d.settings.drillCategories;
      (d.practices || []).forEach(function (evt) {
        (evt.itinerary || []).forEach(function (block) { delete block.linkedDrillId; });
      });
    }

    /* v5: a position holds a LIST of players, not one. With ten kids and five
       spots, every position runs two deep so everybody plays. */
    if (from < 5) {
      (d.practices || []).forEach(function (evt) {
        if (!evt.lineup) return;
        Object.keys(evt.lineup).forEach(function (pos) {
          var v = evt.lineup[pos];
          evt.lineup[pos] = Array.isArray(v) ? v : (v ? [v] : []);
        });
      });
    }

    d.schemaVersion = 5;
    return from !== d.schemaVersion;
  }

  function published() {
    if (!window.PUBLISHED_TEAM_DATA) {
      throw new Error('data/team-data.js did not load - check the script tag order.');
    }
    return clone(window.PUBLISHED_TEAM_DATA);
  }

  /* ---------- load / save ------------------------------------------------ */

  function load() {
    if (state) return state;
    var base = published();
    var raw = null;
    try { raw = localStorage.getItem(LS_KEY); } catch (e) { raw = null; }

    if (raw) {
      try {
        state = backfill(JSON.parse(raw), base);
        loadedFromLocal = true;
        if (migrate(state)) save();
      } catch (e) {
        console.warn('Local working copy was unreadable; using published data.', e);
        state = base;
      }
    } else {
      state = base;
    }
    return state;
  }

  function get() { return state || load(); }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(get()));
      loadedFromLocal = true;
    } catch (e) {
      console.error('Could not autosave to localStorage.', e);
      return false;
    }
    document.dispatchEvent(new CustomEvent('ff:datachanged'));
    return true;
  }

  /* Mutate + autosave in one step:  FF.store.update(function (d) { ... }); */
  function update(mutator) {
    var d = get();
    mutator(d);
    save();
    return d;
  }

  function hasLocalEdits() { return loadedFromLocal; }

  /* ---------- lookups ---------------------------------------------------- */

  function settings()  { return get().settings; }
  function team()      { return get().team; }
  function roster()    { return get().roster; }
  function plays()     { return get().plays; }
  function practices() { return get().practices; }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }
  function playById(id)   { return byId(plays(), id); }

  function playerById(id) { return byId(roster(), id); }
  function eventById(id)  { return byId(practices(), id); }

  function positionsFor(side) {
    return side === 'defense' ? settings().defensePositions : settings().offensePositions;
  }

  /* Events sorted soonest-first, plus the next one at or after today. Used by
     the dashboard and by name-labelling (which week's lineup do we show?). */
  function eventsSorted() {
    return practices().slice().sort(function (a, b) {
      var ka = a.date + 'T' + (a.startTime || '00:00');
      var kb = b.date + 'T' + (b.startTime || '00:00');
      return ka.localeCompare(kb);
    });
  }

  function nextEvent() {
    var today = new Date().toISOString().slice(0, 10);
    var sorted = eventsSorted();
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date >= today) return sorted[i];
    }
    return sorted.length ? sorted[sorted.length - 1] : null;   // else most recent
  }

  /* The active weekly lineup. Each position holds an ordered list of players -
     group 1 is who starts there, group 2 is who rotates in - so a ten-kid
     roster covers five spots twice over and nobody sits all night.

     Returns:
       players  positionId -> the player in the requested group (or null)
       groups   positionId -> every player listed at that position
     Kids are assigned per EVENT, not per play, so a play never stores a name. */
  /* How many deep each side runs. Offense defaults to four so ten kids can
     each cover two spots across the week; defense to two. Both are settings,
     because roster size and how much rotation a coach wants will vary. */
  function LINEUP_GROUPS(side) {
    var cfg = settings().lineupGroups || {};
    var n = side === 'defense' ? cfg.defense : cfg.offense;
    return Math.max(1, Math.min(6, parseInt(n, 10) || 2));
  }

  function lineupList(evt, positionId) {
    var v = (evt && evt.lineup) ? evt.lineup[positionId] : null;
    if (Array.isArray(v)) return v;
    return v ? [v] : [];
  }

  function hasAnyAssignment(evt) {
    var l = (evt && evt.lineup) || {};
    return Object.keys(l).some(function (pos) {
      return lineupList(evt, pos).filter(Boolean).length > 0;
    });
  }

  /* Which event's lineup should label the field? Normally the next one - but
     an upcoming event nobody has filled in yet would blank out every name, so
     skip past empty ones to the nearest event that actually has a lineup. */
  function lineupEvent() {
    var next = nextEvent();
    if (hasAnyAssignment(next)) return next;

    var sorted = eventsSorted();
    var today = new Date().toISOString().slice(0, 10);
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].date >= today && hasAnyAssignment(sorted[i])) return sorted[i];
    }
    for (var j = sorted.length - 1; j >= 0; j--) {
      if (hasAnyAssignment(sorted[j])) return sorted[j];
    }
    return next;
  }

  function activeLineup(eventId, group) {
    var evt = eventId ? eventById(eventId) : lineupEvent();
    var g = group || 0;
    var map = {}, groups = {};
    var ids = (evt && evt.lineup) || {};
    Object.keys(ids).forEach(function (pos) {
      var list = lineupList(evt, pos);
      groups[pos] = list.map(playerById).filter(Boolean);
      map[pos] = list[g] ? playerById(list[g]) : null;
    });
    return { event: evt, players: map, groups: groups };
  }

  /* How many spots any kid is holding this week, keyed by roster id. Drives
     the "everyone is playing / nobody is doubled up" checks on the schedule. */
  function lineupLoad(evt) {
    var counts = {};
    Object.keys((evt && evt.lineup) || {}).forEach(function (pos) {
      lineupList(evt, pos).forEach(function (id) {
        if (!id) return;
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }

  /* Copy a play whole - routes, assignments, ball events and all - so one
     finished play can be the template for the next. The copy is independent:
     editing it never touches the original. */
  function duplicatePlay(id, newName) {
    var src = playById(id);
    if (!src) return null;
    var copy = clone(src);
    copy.id = uuid();
    copy.name = newName || (src.name + ' (copy)');
    update(function (d) { d.plays.push(copy); });
    return copy;
  }

  /* Save a mirrored copy as its own play, so both "run it right" and "run it
     left" are separately callable in a game. */
  function mirrorPlayAsNew(id, newName) {
    var src = playById(id);
    if (!src || !FF.mirror) return null;
    var copy = FF.mirror.play(src, settings());
    copy.id = uuid();
    if (newName) copy.name = newName;
    update(function (d) { d.plays.push(copy); });
    return copy;
  }

  /* Move a play earlier or later in the library. The stored order IS the
     display order everywhere - the play list, and every dropdown that offers
     a play - so companion plays can sit next to each other. */
  function movePlay(id, delta) {
    update(function (d) {
      var from = -1;
      for (var i = 0; i < d.plays.length; i++) {
        if (d.plays[i].id === id) { from = i; break; }
      }
      var to = from + delta;
      if (from < 0 || to < 0 || to >= d.plays.length) return;
      var moved = d.plays.splice(from, 1)[0];
      d.plays.splice(to, 0, moved);
    });
  }

  /* Delete a play, and unlink it from any practice block that referenced it -
     otherwise the schedule keeps a View Play button pointing at nothing. */
  function deletePlay(id) {
    update(function (d) {
      d.plays = d.plays.filter(function (p) { return p.id !== id; });
      (d.practices || []).forEach(function (evt) {
        (evt.itinerary || []).forEach(function (block) {
          if (block.linkedPlayId === id) block.linkedPlayId = null;
        });
      });
    });
  }

  /* ---------- export / import / reset ------------------------------------ */

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* Backup / transfer between devices. */
  function exportBackup() {
    download('team-data.json', JSON.stringify(get(), null, 2), 'application/json');
  }

  /* The file you drop into data/ and push, to publish to everyone. */
  function exportPublishFile() {
    var header =
      '/* ==========================================================================\n' +
      '   PUBLISHED TEAM DATA - the version every visitor sees by default.\n' +
      '   Exported ' + new Date().toISOString() + '\n' +
      '   Replace data/team-data.js with this file and push. See README.md.\n' +
      '   ======================================================================== */\n';
    download('team-data.js',
      header + 'window.PUBLISHED_TEAM_DATA = ' + JSON.stringify(get(), null, 2) + ';\n',
      'text/javascript');
  }

  /* Accepts either an exported .json backup or an exported .js publish file. */
  function importFromText(text) {
    var trimmed = text.trim();
    var jsonText = trimmed;
    var marker = 'window.PUBLISHED_TEAM_DATA';
    if (trimmed.indexOf(marker) !== -1) {
      var start = trimmed.indexOf('{', trimmed.indexOf(marker));
      var end = trimmed.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new Error('Could not find the data block in that .js file.');
      }
      jsonText = trimmed.slice(start, end + 1);
    }
    var parsed = JSON.parse(jsonText);
    if (!parsed || !parsed.settings || !parsed.roster) {
      throw new Error('That file does not look like a team-data file.');
    }
    state = backfill(parsed, published());
    save();
    return state;
  }

  function resetToPublished() {
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
    state = published();
    loadedFromLocal = false;
    document.dispatchEvent(new CustomEvent('ff:datachanged'));
    return state;
  }

  FF.store = {
    load: load, get: get, save: save, update: update,
    hasLocalEdits: hasLocalEdits, uuid: uuid, clone: clone,
    settings: settings, team: team, roster: roster,
    plays: plays, practices: practices,
    playById: playById,
    playerById: playerById, eventById: eventById,
    positionsFor: positionsFor, eventsSorted: eventsSorted, nextEvent: nextEvent,
    duplicatePlay: duplicatePlay, mirrorPlayAsNew: mirrorPlayAsNew,
    movePlay: movePlay, deletePlay: deletePlay,
    activeLineup: activeLineup, lineupList: lineupList, lineupLoad: lineupLoad,
    lineupEvent: lineupEvent,
    LINEUP_GROUPS: LINEUP_GROUPS,
    exportBackup: exportBackup, exportPublishFile: exportPublishFile,
    importFromText: importFromText, resetToPublished: resetToPublished
  };
})(window.FF = window.FF || {});
