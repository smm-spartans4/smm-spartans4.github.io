/* ============================================================================
   FF.announcer - speaks a play out loud.

   Uses the browser's built-in speech synthesis. No key, no service, no cost,
   and on a phone or tablet the system voices work with no connection - so the
   announcer still talks at a field with no signal.

   A script is plain text with tokens in braces:

       "{play}. {QB} takes the snap and rolls right.
        Fake to {Y}. Handoff to {Z} around the left end."

   Tokens are position ids ({QB}, {X}, {Y}, {Z}, {C}, {RUSH}, {LU} ...), plus
   {play} and {team}. Each position fills with whoever is playing it in the
   selected group this week, so one script reads correctly every week without
   being rewritten.

   Two things the browser imposes, which shape the design:
     - iOS will not speak unless the call happens inside a real tap, so every
       entry point here is wired to a button.
     - Voices load asynchronously, so ready() waits for them.
   ========================================================================== */
(function (FF) {
  'use strict';

  var VOICE_KEY = 'ff.voice';
  var RATE_KEY = 'ff.speechRate';
  var AUTO_KEY = 'ff.autoAnnounce';

  function supported() {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  function get(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function getRate() { return parseFloat(get(RATE_KEY, '1.1')) || 1.1; }
  function setRate(v) { set(RATE_KEY, String(v)); }
  function getAuto() { return get(AUTO_KEY, '0') === '1'; }
  function setAuto(on) { set(AUTO_KEY, on ? '1' : '0'); }
  function getVoiceName() { return get(VOICE_KEY, ''); }
  function setVoiceName(n) { set(VOICE_KEY, n || ''); }

  /* Voices arrive late in most browsers, and on some only after a first call
     to getVoices(). Poll briefly rather than trusting voiceschanged alone. */
  function ready(callback) {
    if (!supported()) { callback([]); return; }
    var tries = 0;

    function attempt() {
      var voices = window.speechSynthesis.getVoices() || [];
      if (voices.length || tries > 20) { callback(voices); return; }
      tries++;
      setTimeout(attempt, 100);
    }

    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.onvoiceschanged = null;
        callback(window.speechSynthesis.getVoices() || []);
      };
    }
    attempt();
  }

  function voices() {
    return supported() ? (window.speechSynthesis.getVoices() || []) : [];
  }

  /* Pick a voice, in order of preference:

       1. whatever this viewer chose for themselves
       2. the team default, published with the data - matched loosely, since
          the full name differs by platform ("Microsoft Guy Online (Natural) -
          English (United States)" vs just "Guy")
       3. an English voice installed ON the device, which is the only kind
          guaranteed to work with no signal
       4. any English voice
       5. anything at all

     Steps 3 onward matter: the nicest voices tend to be the streaming ones,
     and at a field with no bars those simply do not speak. */
  function chosenVoice() {
    var all = voices();
    if (!all.length) return null;

    var mine = getVoiceName();
    for (var i = 0; i < all.length; i++) if (all[i].name === mine) return all[i];

    var preferred = '';
    try { preferred = (FF.store.settings().defaultVoiceName || '').trim(); }
    catch (e) { preferred = ''; }

    if (preferred) {
      for (var p = 0; p < all.length; p++) if (all[p].name === preferred) return all[p];
      var needle = preferred.toLowerCase();
      for (var q = 0; q < all.length; q++) {
        if ((all[q].name || '').toLowerCase().indexOf(needle) !== -1) return all[q];
      }
    }

    for (var j = 0; j < all.length; j++) {
      if (all[j].localService && /^en/i.test(all[j].lang || '')) return all[j];
    }
    for (var k = 0; k < all.length; k++) if (/^en/i.test(all[k].lang || '')) return all[k];
    return all[0];
  }

  /* What is actually going to speak, for showing in the UI. */
  function activeVoiceName() {
    var v = chosenVoice();
    return v ? v.name : '';
  }

  /* ---------- names ------------------------------------------------------- */

  /* Say "Jake" unless another kid on the field this week is also a Jake, in
     which case say "Jake M". Reading a written "Jake M." aloud every time
     sounds robotic; reading it only when it disambiguates sounds like a coach. */
  function speakableName(player, lineupPlayers) {
    if (!player || !player.name) return '';
    var parts = String(player.name).trim().split(/\s+/).filter(Boolean);
    var first = parts[0];
    if (parts.length === 1) return first;

    var clash = Object.keys(lineupPlayers || {}).some(function (pos) {
      var other = lineupPlayers[pos];
      if (!other || other.id === player.id || !other.name) return false;
      return other.name.trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase();
    });
    if (!clash) return first;
    return first + ' ' + parts[parts.length - 1].replace(/\./g, '');
  }

  /* ---------- token filling ------------------------------------------------ */

  function fill(text, play, lineupPlayers) {
    if (!text) return '';
    return String(text).replace(/\{(\w+)\}/g, function (whole, key) {
      if (key === 'play') return (play && play.name) || 'This play';
      if (key === 'team') return FF.store.team().name;
      var player = (lineupPlayers || {})[key];
      if (player) return speakableName(player, lineupPlayers);
      return key;                       // no one assigned: say the position
    });
  }

  /* A serviceable script built from the ball events, used when the coach has
     not written one. Always something to say, never a blank button. */
  function defaultScript(play) {
    if (!play) return '';
    if (play.side === 'defense') {
      return '{play}. Defense, know your job before the snap.';
    }
    var bits = ['{play}', 'Snap to {QB}'];
    FF.ball.fakeEvents(play).forEach(function (f) {
      if (!f.toPositionId) return;
      bits.push((f.type === 'fake-pass' ? 'Fake pass to {' : 'Fake handoff to {')
        + f.toPositionId + '}');
    });
    var real = FF.ball.realEvent(play);
    if (real && real.toPositionId) {
      bits.push((real.type === 'pass' ? 'Pass to {' : 'Handoff to {')
        + real.toPositionId + '}');
    }
    return bits.join('. ') + '.';
  }

  function scriptFor(play) {
    var written = play && play.narration ? String(play.narration).trim() : '';
    return written || defaultScript(play);
  }

  /* Each player's job, in their own name. Uses the assignment notes already
     written for the role legend, so there is nothing new to author. */
  function assignmentLines(play, lineupPlayers) {
    if (!play) return [];
    return (play.players || []).map(function (pl) {
      var who = (lineupPlayers || {})[pl.positionId];
      var name = who ? speakableName(who, lineupPlayers) : pl.positionId;
      var note = (pl.assignmentNote || '').trim();
      if (!note) return null;
      return name + '. ' + fill(note, play, lineupPlayers);
    }).filter(Boolean);
  }

  /* ---------- speaking ------------------------------------------------------ */

  var queue = [];
  var speaking = false;
  var onDoneCallback = null;

  function cancel() {
    queue = [];
    speaking = false;
    if (supported()) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
  }

  function next() {
    if (!queue.length) {
      speaking = false;
      var done = onDoneCallback;
      onDoneCallback = null;
      if (done) done();
      return;
    }
    var line = queue.shift();
    var utter = new window.SpeechSynthesisUtterance(line);
    var voice = chosenVoice();
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    utter.rate = getRate();
    utter.pitch = 1;
    utter.onend = next;
    utter.onerror = next;          // a failed line must not stall the rest
    window.speechSynthesis.speak(utter);
  }

  /* MUST be called straight from a tap handler, or iOS silently ignores it.

     Note the guard on cancel(): calling speechSynthesis.cancel() immediately
     before speak() makes Chrome swallow the first utterance or delay it by
     several hundred milliseconds. Only clear the pipe when there is actually
     something in it. */
  function speak(lines, onDone) {
    if (!supported()) return false;
    if (speaking || queue.length) cancel();
    queue = (Array.isArray(lines) ? lines : [lines])
      .map(function (l) { return String(l || '').trim(); })
      .filter(Boolean);
    if (!queue.length) return false;
    onDoneCallback = onDone || null;
    speaking = true;
    next();
    return true;
  }

  function isSpeaking() { return speaking; }

  FF.announcer = {
    supported: supported, ready: ready, voices: voices,
    getVoiceName: getVoiceName, setVoiceName: setVoiceName,
    activeVoiceName: activeVoiceName,
    getRate: getRate, setRate: setRate,
    getAuto: getAuto, setAuto: setAuto,
    fill: fill, scriptFor: scriptFor, defaultScript: defaultScript,
    assignmentLines: assignmentLines, speakableName: speakableName,
    speak: speak, cancel: cancel, isSpeaking: isSpeaking
  };
})(window.FF = window.FF || {});
