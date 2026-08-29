/* ============================================================================
   Roster page. Add, edit and remove players.

   There is no Save button anywhere: every keystroke writes straight through to
   the working copy in localStorage (spec section 6). Rows are therefore only
   re-rendered on add / delete / sort - never while typing, which would steal
   focus out from under the coach mid-word.
   ========================================================================== */
(function (FF) {
  'use strict';

  var listEl, saveStateEl, countEl;
  var saveTimer = null;

  function h(tag, attrs, kids) { return FF.ui.h(tag, attrs, kids); }

  /* ---------- autosave --------------------------------------------------- */

  function flagSaved() {
    if (!saveStateEl) return;
    saveStateEl.textContent = 'Saved';
    saveStateEl.classList.add('is-on');
    clearTimeout(flagSaved._t);
    flagSaved._t = setTimeout(function () {
      saveStateEl.classList.remove('is-on');
    }, 1400);
  }

  /* Typing is debounced so we are not serialising the whole team on every
     keypress; structural changes save immediately. */
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      FF.store.save();
      FF.ui.refreshBanner();
      flagSaved();
    }, 350);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    FF.store.save();
    FF.ui.refreshBanner();
    flagSaved();
  }

  /* ---------- rendering --------------------------------------------------- */

  function field(player, key, opts) {
    var input = h('input', {
      type: 'text',
      'class': opts.cls,
      value: player[key] || '',
      placeholder: opts.placeholder,
      'aria-label': opts.label,
      'data-id': player.id,
      'data-field': key
    });
    if (opts.inputmode) input.setAttribute('inputmode', opts.inputmode);
    if (opts.maxlength) input.setAttribute('maxlength', opts.maxlength);
    return input;
  }

  function row(player) {
    var del = h('button', {
      type: 'button',
      'class': 'ff-row-del',
      'data-del': player.id,
      title: 'Remove ' + (player.name || 'this player'),
      'aria-label': 'Remove ' + (player.name || 'this player'),
      text: '×'
    });

    return h('li', { 'class': 'ff-roster-row', 'data-id': player.id }, [
      field(player, 'jersey', {
        cls: 'ff-f-jersey', placeholder: '#', label: 'Jersey number',
        inputmode: 'numeric', maxlength: 3
      }),
      field(player, 'name', {
        cls: 'ff-f-name', placeholder: 'Player name', label: 'Player name'
      }),
      del
    ]);
  }

  function render() {
    var roster = FF.store.roster();
    listEl.innerHTML = '';

    if (!roster.length) {
      listEl.appendChild(h('li', { 'class': 'ff-empty' }, [
        h('p', { text: 'No players yet.' }),
        h('p', { 'class': 'ff-small', text: 'Add your first player below.' })
      ]));
    } else {
      roster.forEach(function (p) { listEl.appendChild(row(p)); });
    }

    countEl.textContent = roster.length + (roster.length === 1 ? ' player' : ' players');
  }

  /* ---------- actions ----------------------------------------------------- */

  function addPlayer() {
    var created;
    FF.store.update(function (d) {
      created = { id: FF.store.uuid(), name: '', jersey: '' };
      d.roster.push(created);
    });
    FF.ui.refreshBanner();
    flagSaved();
    render();

    var input = listEl.querySelector('[data-id="' + created.id + '"] .ff-f-name');
    if (input) { input.focus(); input.scrollIntoView({ block: 'center' }); }
  }

  function deletePlayer(id) {
    var p = FF.store.playerById(id);
    var who = (p && p.name) ? p.name : 'this player';
    if (!window.confirm('Remove ' + who + ' from the roster?')) return;

    FF.store.update(function (d) {
      d.roster = d.roster.filter(function (x) { return x.id !== id; });
      /* A removed player must not linger in any week's lineup or captain slot. */
      (d.practices || []).forEach(function (evt) {
        if (evt.lineup) {
          Object.keys(evt.lineup).forEach(function (pos) {
            if (evt.lineup[pos] === id) evt.lineup[pos] = null;
          });
        }
        evt.captainRosterPlayerIds = (evt.captainRosterPlayerIds || [])
          .filter(function (x) { return x !== id; });
        evt.unavailableRosterPlayerIds = (evt.unavailableRosterPlayerIds || [])
          .filter(function (x) { return x !== id; });
      });
    });
    FF.ui.refreshBanner();
    flagSaved();
    render();
  }

  function sortBy(mode) {
    if (!mode) return;
    FF.store.update(function (d) {
      d.roster.sort(function (a, b) {
        if (mode === 'name') {
          return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
        }
        var na = parseInt(a.jersey, 10);
        var nb = parseInt(b.jersey, 10);
        if (isNaN(na) && isNaN(nb)) return 0;
        if (isNaN(na)) return 1;          // unnumbered players fall to the end
        if (isNaN(nb)) return -1;
        return na - nb;
      });
    });
    FF.ui.refreshBanner();
    flagSaved();
    render();
  }

  /* ---------- wiring ------------------------------------------------------ */

  function init() {
    FF.ui.init();

    listEl = document.getElementById('rosterList');
    saveStateEl = document.getElementById('saveState');
    countEl = document.getElementById('rosterCount');

    render();

    /* One delegated listener for the whole list, so rows added later just work. */
    listEl.addEventListener('input', function (e) {
      var t = e.target;
      var id = t.getAttribute('data-id');
      var key = t.getAttribute('data-field');
      if (!id || !key) return;
      var p = FF.store.playerById(id);
      if (!p) return;
      p[key] = t.value;
      saveSoon();
    });

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-del]');
      if (btn) deletePlayer(btn.getAttribute('data-del'));
    });

    /* Enter at the end of a row adds the next player - fast bulk entry. */
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (!e.target.matches('input')) return;
      e.preventDefault();
      saveNow();
      addPlayer();
    });

    document.getElementById('addPlayer').addEventListener('click', addPlayer);

    document.getElementById('sortBy').addEventListener('change', function (e) {
      sortBy(e.target.value);
      e.target.value = '';
    });

    /* Never lose a half-typed name to a debounce timer. */
    window.addEventListener('beforeunload', function () {
      if (saveTimer) { clearTimeout(saveTimer); FF.store.save(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})(window.FF = window.FF || {});
