# Youth Flag Football Team Site — Build Spec for Claude Code

**Project:** Interactive practice-schedule and play-diagram website for a 4th-grade, 5-on-5 flag football team.
**Audience for this document:** Claude Code (implementer). Written as a complete build brief — read it fully before starting, then use the "Suggested Build Order" near the end as a non-binding sequencing guide.
**Owner/coach:** Will edit rosters, plays, and schedules directly in the site. Parents and kids are read-only visitors.

---

## 1. Project Summary

Build a static, no-backend website for a youth flag football team that does two things:

1. **Practice Scheduler** — the coach builds practice sessions and itineraries (warm-up, drills, water breaks, play walkthroughs, scrimmage, etc.), and parents/kids can view them on the web.
2. **Interactive Play Diagrams** — the coach builds offensive and defensive plays on a to-scale field with 5 players per side. Plays *animate*: the ball snaps from center to QB, then either hands off to a running back or is thrown to a receiver. Viewers can play, pause, freeze at any instant, scrub through the play, switch between a top-down view and a stylized field-level view from the defense's perspective, and flip/mirror any play left-to-right.

This is a hobby/team project for one coach, no user accounts, no server, and no payment involved. Keep the implementation simple, dependency-light, and easy to maintain by a non-professional developer.

### Confirmed decisions (from planning conversation)

- **Access model:** Deploy as a public static website (e.g., GitHub Pages / Netlify / Vercel) so the coach can share one link with all parents.
- **Data storage:** Coach edits roster/plays/schedule *in-browser*, autosaved to `localStorage`. An Export/Import feature (JSON file) is used both as a backup and as the mechanism to *publish* changes to the live site (see §10 — this is important, read it before building the data layer).
- **Field-level defense view:** A stylized 2D illustration (not true 3D) — see §8.4 for the exact technique.
- **Build sequencing:** One full spec; Claude Code may sequence the implementation as it sees fit (a suggested order is provided in §14, but it is not mandatory).

### Non-goals (explicitly out of scope)

- No login/authentication, no user accounts.
- No backend server, database, or paid hosting.
- No real-time multi-user collaboration or live sync between devices.
- No true 3D rendering engine (no three.js) — the "field-level" view is a 2D pseudo-perspective illustration, not a 3D camera.

---

## 2. League Rules (Confirmed) & Remaining Assumptions

The coach has confirmed the following league-specific rules for this team — build these in as real field markings/behavior, not placeholders. A couple of items are still open (see §16).

**Confirmed:**

- **Field:** 30 yards wide x 70 yards long overall — a 50-yard playing field between the two goal lines, plus a 10-yard end zone at each end (10 + 50 + 10 = 70).
- **Starting spot / first down:** offense starts a possession at their own 5-yard line; reaching the 25-yard line — **midfield**, exactly halfway between the two goal lines on this 50-yard playing field — earns a first down (a 20-yard gain). This is a single, fixed first-down marker at midfield (not a moving chain-set) — render it as a permanent field marking (§5), computed once from settings, not recalculated per play.
- **Touchdown:** crossing the goal line into the 10-yard end zone.
- **No-rush zone:** any defender rushing the quarterback must start at least 7 yards from the line of scrimmage at the snap. Show this as a guide line when building/viewing defensive plays (§5).
- **No blocking or screening:** offensive players may never block or screen defenders. Once the ball carrier has crossed the line of scrimmage, every other offensive player must stop advancing — no downfield blocking of any kind. Never use "block" language anywhere in UI copy or sample data (see §7.4).
- **QB cannot run:** the quarterback may hand off or pass but is never a ball carrier on a designed run, and can't take off upfield if a play breaks down. The Play Editor's ball-event options should reflect this — see the note on "Scramble" in §7.3.
- **Offensive positions:** Center (C), Quarterback (QB), and three skill positions — **X, Y, and Z**. The letters are alignment-based, not role-based: **X is always the left-most skill player on the field, Z is always the right-most, and Y is always in between** — this ordering holds in every formation, so the letter alone always tells you where that player lines up relative to the other two, no matter which formation is called.
- **Two offensive formations — Power and Spread:** C and QB line up the same way in both (QB directly behind C); X always lines up wide left on the line of scrimmage in both. They differ in where Y and Z go:
  - **Power:** Y and Z are both offset into the backfield — Y offset left, Z offset right *and* deeper than Y.
  - **Spread:** Y and Z both line up on the right side instead — Y just off the ball, inside; Z on the line, outside — keeping Y left of Z, same as always.
  - Concrete starting coordinates for both are seeded in `settings.formations` (§4) as reusable presets in the Play Editor (§7.2). The coach draws the actual plays from these by hand.
- **Default defense — the 2-deep, 2-under zone ("Cover 2"):** the team's base defensive shell, with a Rusher (RUSH) 7 yards off the ball plus four zone defenders — Left Under (LU), Right Under (RU), Left Deep (LD), Right Deep (RD) — splitting the field's width and depth in half. Ship this exact alignment as a pre-loaded seed play (§7.5) so the site has a working defensive example on day one, not an empty library.

**Still open / editable defaults (see §16):**

- **Roster size:** Coach can add any number of players (typically 8–12 for a 4th-grade team), and assigns 5 of them to on-field slots for any given play.

Add a **Settings page** where the coach can edit field dimensions, the first-down/no-rush numbers, position labels, formation presets, and team info (name, colors) once, and have those defaults apply everywhere — keep every number in this section as a setting, not a hardcoded constant, in case rules change season to season or the coach moves to a different league.

---

## 3. Tech Stack & Architecture

Keep this simple and dependency-light so it's easy to host for free and easy for the coach (via Claude Code) to maintain later.

- **Plain HTML/CSS/JavaScript**, no framework required (no React/Vue needed) and no build step — the site should be viewable by opening `index.html`-style pages, and trivially deployable to GitHub Pages/Netlify by pushing the repo.
- **Rendering for the field and players:** SVG (preferred) or HTML5 Canvas. SVG is recommended because it scales crisply at any size (important for phones vs. desktop), makes "to-scale field" math straightforward, supports crisp printing, and makes drawing/editing routes with pointer events natural. Use a `<svg viewBox="...">` sized to the field's real-world proportions so everything stays to scale.
- **Animation:** a small custom animation loop (`requestAnimationFrame`) driven by a **timeline/keyframe model** (see §7.3) — not CSS animations — so that scrubbing, freezing, and reversing playback all work identically.
- **State/storage:** `localStorage` for autosave, plus JSON export/import (see §10).
- **No backend, no database, no API keys.**
- **Multi-page or single-page:** either is fine; a small router-less multi-page static site (separate HTML files per section, sharing common JS/CSS modules) is simplest to reason about and deploy. Structure suggestion:
  - `index.html` — dashboard/home
  - `roster.html` — roster management
  - `plays.html` — play library (list/filter offense & defense)
  - `play-editor.html` — create/edit a single play
  - `play-viewer.html` — animated play viewer (this can also be an embedded component reused inside `play-editor.html`)
  - `drills.html` — drills library
  - `schedule.html` — practice/game schedule & itinerary builder
  - `settings.html` — field dimensions, position labels, team info, export/import
  - `/js/` — shared modules (data store, field-drawing, animation engine, ball-logic, mirror logic)
  - `/css/` — shared styles
- **Responsive/mobile-first:** most parents will view this on a phone. Design and test at phone width first, then scale up.
- **Print support:** the practice schedule/itinerary should have a clean print stylesheet (coach may print a paper copy for practice).

---

## 4. Data Model

Design a single JSON "team data" document as the source of truth, with this shape (adjust field names as needed, but keep the structure — it needs to support export/import as one file):

```json
{
  "team": {
    "name": "string",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "season": "string"
  },
  "settings": {
    "fieldWidthYards": 30,
    "playingFieldLengthYards": 50,
    "endZoneDepthYards": 10,
    "firstDownLineYards": 25,
    "defaultStartingYardLine": 5,
    "noRushZoneYards": 7,
    "offensePositions": [
      { "id": "C", "label": "Center" },
      { "id": "QB", "label": "Quarterback" },
      { "id": "X", "label": "X — always the left-most skill player" },
      { "id": "Y", "label": "Y — always the middle skill player" },
      { "id": "Z", "label": "Z — always the right-most skill player" }
    ],
    "defensePositions": [
      { "id": "RUSH", "label": "Rusher" },
      { "id": "LU", "label": "Left Under" },
      { "id": "RU", "label": "Right Under" },
      { "id": "LD", "label": "Left Deep" },
      { "id": "RD", "label": "Right Deep" }
    ],
    "formations": [
      {
        "id": "power",
        "name": "Power",
        "side": "offense",
        "description": "X wide left on the line. Y and Z offset in the backfield — Y left, Z right and deeper.",
        "positions": {
          "C":  { "xYards": 15, "yYards": 0 },
          "QB": { "xYards": 15, "yYards": -3 },
          "X":  { "xYards": 3,  "yYards": 0 },
          "Y":  { "xYards": 11, "yYards": -3 },
          "Z":  { "xYards": 19, "yYards": -5 }
        }
      },
      {
        "id": "spread",
        "name": "Spread",
        "side": "offense",
        "description": "X wide left on the line. Y and Z both line up right — Y just off the ball inside, Z on the line outside.",
        "positions": {
          "C":  { "xYards": 15, "yYards": 0 },
          "QB": { "xYards": 15, "yYards": -3 },
          "X":  { "xYards": 3,  "yYards": 0 },
          "Y":  { "xYards": 22, "yYards": -1 },
          "Z":  { "xYards": 27, "yYards": 0 }
        }
      }
    ]
  },
  "roster": [
    { "id": "uuid", "name": "string", "jersey": "string/number", "notes": "string" }
  ],
  "plays": [
    {
      "id": "uuid",
      "name": "string",
      "side": "offense | defense",
      "tags": ["run", "pass", "blitz", "zone", "man", "..."],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "QB",
          "rosterPlayerId": "uuid | null",
          "start": { "xYards": 0, "yYards": 0 },
          "route": [
            { "t": 0, "xYards": 0, "yYards": 0 },
            { "t": 1.2, "xYards": 3, "yYards": 2 }
          ],
          "assignmentNote": "string, plain-language role description"
        }
      ],
      "ball": {
        "mode": "auto | manual",
        "carrierEvents": [
          { "t": 0, "type": "snap", "fromPositionId": "C", "toPositionId": "QB" },
          { "t": 1.0, "type": "fake-handoff | fake-pass", "toPositionId": "Y", "durationSeconds": 0.6 },
          { "t": 1.8, "type": "handoff | pass", "toPositionId": "Z" }
        ],
        "manualRoute": [
          { "t": 0, "xYards": 0, "yYards": 0 }
        ]
      }
    }
  ],
  "drills": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string, plain-language instructions a parent-coach can run without you there",
      "category": "warmup | offense | defense | conditioning | ball-handling | agility | other",
      "suggestedDurationMinutes": 10,
      "linkedPlayIds": ["uuid"]
    }
  ],
  "practices": [
    {
      "id": "uuid",
      "type": "practice | game",
      "date": "ISO date",
      "startTime": "HH:MM",
      "location": "string",
      "opponent": "string, games only",
      "captainRosterPlayerIds": ["uuid", "uuid"],
      "itinerary": [
        {
          "id": "uuid",
          "label": "string (e.g. Warm-up, Water Break, Play Walkthrough)",
          "durationMinutes": 10,
          "linkedPlayId": "uuid | null",
          "linkedDrillId": "uuid | null",
          "notes": "string"
        }
      ]
    }
  ]
}
```

Notes:
- Coordinates (`xYards`, `yYards`) inside a play's `route`/`start` fields are **relative to that play's own line of scrimmage** (`yYards = 0` at the LOS, negative behind it), not pixels and not absolute field position — this keeps a play's routes reusable no matter where on the field it's run from. `lineOfScrimmageYard` (yards from the offense's own goal line, default from `settings.defaultStartingYardLine`) is used only at render time to place the play correctly on the full-field diagram described in §5.
- `ball.mode: "auto"` means the ball path is *derived* from `carrierEvents` and the relevant players' routes (see §7.3) — this should be the default and cover the vast majority of plays (snap → QB → handoff to Y or Z, or snap → QB → pass to X, Y, or Z). `manual` lets the coach override with a hand-drawn ball path for trick plays.
- `assignmentNote` is what powers the plain-language "role legend" shown next to the field during playback (e.g., "X: run a 5-yard out route, then hold position.").
- `settings.formations` are reusable **starting-position presets**, not full plays — picking one in the Play Editor (§7.2) just pre-places the 5 offensive tokens (C/QB/X/Y/Z) at that formation's coordinates so the coach can start drawing routes immediately instead of placing every token from scratch on every new play.

---

## 5. Field Model & Coordinate System

Two coordinate systems, both in yards (never store pixels in data — convert to screen pixels only at render time):

- **Absolute field coordinates** (used to draw the permanent field background): `x = 0` at the left sideline, increasing to the right, up to `settings.fieldWidthYards` (30). `y = 0` at the very back of the offense's own end zone; the offense's own goal line sits at `y = endZoneDepthYards` (10); the opponent's goal line sits at `y = endZoneDepthYards + playingFieldLengthYards` (60); the back of the opponent's end zone is at `y = 2*endZoneDepthYards + playingFieldLengthYards` (70).
- **Play-relative coordinates** (used inside each play's `route`/`start` data, §4): `y = 0` at that play's own line of scrimmage, negative behind it, positive downfield. Convert to absolute for rendering with `absoluteY = endZoneDepthYards + play.lineOfScrimmageYard + relativeY`.

Permanent field background (draw from `settings`, to scale, every time — same for every play):

- **Surface:** green field color throughout, including the end zones (optionally a slightly different shade to distinguish them, but keep it green/turf, not a different color scheme).
- **Boundary lines:** thin white lines for both sidelines and both end lines (back of each end zone), plus a white line at each goal line (`y = 10` and `y = 60`).
- **Yard lines:** thin white lines spanning the full width of the field every 5 yards through the 50-yard playing field (i.e., at `y = 15, 20, 25, 30, 35, 40, 45, 50, 55`, in addition to the goal lines at `y = 10` and `y = 60`).
- **First-down line:** a **red dotted/dashed line**, spanning the field width, fixed at midfield (`y = 35`) — exactly halfway between the two goal lines (`y = 10` and `y = 60`), i.e., 25 yards from either one. This is a constant field marking derived from `settings.firstDownLineYards`, not something recomputed per play. If yard-number labels are drawn on the field, follow the standard convention of counting up from each goal line to midfield (5, 10, 15, 20, 25) and mirroring back down toward the opposite goal (20, 15, 10, 5) — the "25" from both directions lands on this same midfield line.
- **End zones:** the two 10-yard zones (`y = 0–10` and `y = 60–70`), visually distinguishable (e.g., subtle shading or an end-zone label) but still green.

Per-play guide line (only relevant while building/viewing a **defensive** play, drawn relative to that play's own line of scrimmage, not the absolute field):

- **No-rush line:** a dashed guide line (use a color other than red/white/green — e.g., yellow or blue — so it's never confused with the first-down line or field markings), spanning the field width at `relativeY = settings.noRushZoneYards` (7 yards downfield of that play's line of scrimmage, on the defense's side), labeled "No-Rush Line (7 yd)." This shows the coach/kids where a rushing defender must line up behind. As a nice-to-have, softly warn (don't block) if a defender is placed closer than this to the line of scrimmage.

Field dimensions, end zone depth, first-down yardage, and the no-rush distance all come from `settings` (§4), not hardcoded, in case any of these numbers change.

---

## 6. Roster Management (`roster.html`)

- Table/list of players: name, jersey number, optional notes (e.g., "fast," "lefty," position preference).
- Add / edit / delete players.
- This roster feeds a dropdown anywhere a play or itinerary needs to reference a specific kid (assigning roster players to the 5 on-field slots in a given play). Assignments are **per-play**, so the same "X" slot can have a different kid in different plays, and the coach can reassign at any time without redrawing routes.
- Changes autosave to `localStorage` immediately (see §10).

---

## 7. Play Library & Play Editor

### 7.1 Play Library (`plays.html`)

- List all saved plays, filterable by side (Offense/Defense) and by tag (run/pass/zone/man/etc.).
- Each play card shows: name, side, tags, and a small static preview thumbnail (formation snapshot).
- Actions: View/Play, Edit, Duplicate, Delete, and **Flip & Save As New** (creates a mirrored copy — see §8.5).

### 7.2 Formation Setup

- Start every new play from a formation editor: a to-scale field (§5) with 5 draggable player tokens (per the side being edited — offense or defense position set from `settings`).
- **For offensive plays**, offer a one-click starting point from `settings.formations` — "Start from Power" or "Start from Spread" (§4) — which pre-places C/QB/X/Y/Z at that formation's coordinates; the coach can still drag any token from there to customize. Defensive plays always start from a blank field of 5 draggable tokens (or from the seeded 2-deep shell, §7.5, via Duplicate).
- Drag each token to its starting position; positions snap to reasonable increments (e.g., nearest 0.5 yard) for consistency but allow fine placement.
- Assign each slot a roster player via dropdown (optional at first, can be filled in later or per-practice).
- Label toggle: show tokens by position label (C, QB, X, Y, Z / RUSH, LU, RU, LD, RD), by jersey number, or by player name.

### 7.3 Route Drawing & Ball Logic

This is the core interactive feature — get this right.

- **Route drawing:** for each player, let the coach click/tap to place waypoints on the field (each waypoint is a point in yards); the app builds a smooth path through them and assigns default timing (even spacing, or the coach can drag a per-waypoint time marker on a timeline scrubber to adjust speed/pauses). Store as the `route` array (`t`, `xYards`, `yYards`) described in §4.
- **Ball events:** the coach defines a short sequence of ball events on a play (`ball.carrierEvents`):
  1. **Snap** — always first, at `t=0`, ball moves from Center's position to QB's position over a brief, fixed duration (e.g., 0.3s).
  2. **Optional fake(s)** — zero or more **fake-handoff** or **fake-pass** events before the real ball movement. A fake references the decoy player (`toPositionId`) and a `durationSeconds` window; it does **not** move the ball (the ball visually stays with the QB throughout the fake), but it does trigger the "faking" visual treatment described below on the decoy player for that window. Multiple fakes are allowed on one play (e.g., fake to Y, then a real pass to Z), letting the coach diagram play-action and misdirection.
  3. **Then exactly one real ball-movement event:**
     - **Handoff** to Y or Z at time `t` — ball moves from QB's position at time `t` to that player's position at time `t` (a short, quick interpolation, not a long arc).
     - **Pass** to any eligible receiver at time `t` — ball travels from QB's position at time `t` along an arc (simple quadratic Bezier curve, apex partway through) to the receiver's position at the moment of catch (`t + flightTime`); `flightTime` can be a simple constant or computed from distance (e.g., `distance / passSpeedYardsPerSecond`).
     - **Scramble** — **not legal in this league** (§2: the QB cannot run). Omit this as a ball-event option in the UI entirely, or keep the field in the schema for forward-compatibility but never expose it as a choice in the Play Editor.
  4. After a handoff or catch, the ball is "attached" to that player's route for the remainder of the play — the ball rendering after that point should just follow the carrying player's route positions, not a separately authored path.
- **Faking visual treatment:** during a fake-handoff/fake-pass window (from its `t` to `t + durationSeconds`), render the decoy player's token in a visibly distinct state — e.g., a different fill color plus a small icon or dashed outline — so anyone watching, including at a frozen or scrubbed frame (not just during live playback), can immediately tell that player doesn't actually have the ball and is selling a fake. Return the token to its normal appearance once the fake window ends. This state is purely visual — auto mode always derives the ball's actual position from the real (non-fake) events only, so a fake never affects where the ball is drawn.
- **Auto mode** (`ball.mode: "auto"`, default): the animation engine computes the ball's position at any time `t` purely from `carrierEvents` + the relevant players' `route` arrays — no separate ball path needs to be hand-authored for the common cases above. This keeps ball motion always visually consistent with player motion.
- **Manual mode:** for trick plays (laterals, multiple handoffs, etc.), allow a hand-authored `manualRoute` for the ball, editable the same way a player route is.
- **Validation/UX niceties (nice-to-have, not blocking):** warn (don't block) if a pass target's route doesn't have a waypoint near the catch time, or if a handoff target isn't close to the QB at handoff time.

### 7.4 Assignment Notes

- Each player slot has a free-text `assignmentNote` field (e.g., "Snap the ball, then hold your position," "Run a 5-yard out route toward the sideline, then look for the pass," or "Take the fake handoff and sell it — run like you have the ball"). Show this as an editable text box in the editor, associated with that player token.
- **Reminder — no blocking or screening in this league:** never use "block" language in default text, sample plays, or UI copy anywhere in the app. Once the ball carrier crosses the line of scrimmage, every other offensive player's realistic assignment is to stop/hold position, not engage a defender — phrase any default/placeholder assignment notes accordingly (e.g., "snap, then hold position," not "snap, then block").
- These notes power the **Role Legend** panel shown during playback (§8.3) — this is what makes the tool useful for explaining plays to 4th graders and their parents in plain language, not just X's and O's.

### 7.5 Seed Content — Default Defensive Play

Ship `data/team-data.json` with one pre-loaded play so the Play Library isn't empty on first load: the team's base defense, the **2-deep, 2-under zone ("Cover 2")**, using the position set and depths below. This is the same shell described in §2 — embed it as a literal entry in the seed `plays` array (§4 shape), not just documentation.

This seed play is intentionally **static** — a pre-snap alignment reference, not a simulation of how the defense reacts to a specific offensive play. Each defender's `route` is just two identical points (hold the zone). The coach can Duplicate it (§7.1) as a starting point for a play with real movement — a stunt, a coverage rotation, a blitz — once one is needed.

```json
{
  "id": "seed-cover-2-shell",
  "name": "2-Deep Shell (Cover 2)",
  "side": "defense",
  "tags": ["zone", "cover-2"],
  "durationSeconds": 1,
  "lineOfScrimmageYard": 5,
  "players": [
    {
      "positionId": "RUSH",
      "rosterPlayerId": null,
      "start": { "xYards": 13.5, "yYards": 7 },
      "route": [
        { "t": 0, "xYards": 13.5, "yYards": 7 },
        { "t": 1, "xYards": 13.5, "yYards": 7 }
      ],
      "assignmentNote": "Line up 7 yards off the ball, just left of center. Rush straight upfield at the snap — get skinny, get home, no looping wide."
    },
    {
      "positionId": "LU",
      "rosterPlayerId": null,
      "start": { "xYards": 9, "yYards": 4.5 },
      "route": [
        { "t": 0, "xYards": 9, "yYards": 4.5 },
        { "t": 1, "xYards": 9, "yYards": 4.5 }
      ],
      "assignmentNote": "Line up 4-5 yards off the ball, left of center. Cover the flat and short middle on your side — nobody catches it in front of you for free. Key: the running back first, then any receiver settling short."
    },
    {
      "positionId": "RU",
      "rosterPlayerId": null,
      "start": { "xYards": 21, "yYards": 4.5 },
      "route": [
        { "t": 0, "xYards": 21, "yYards": 4.5 },
        { "t": 1, "xYards": 21, "yYards": 4.5 }
      ],
      "assignmentNote": "Line up 4-5 yards off the ball, right of center. Cover the flat and short middle on your side — nobody catches it in front of you for free. Key: the running back first, then any receiver settling short."
    },
    {
      "positionId": "LD",
      "rosterPlayerId": null,
      "start": { "xYards": 8, "yYards": 12 },
      "route": [
        { "t": 0, "xYards": 8, "yYards": 12 },
        { "t": 1, "xYards": 8, "yYards": 12 }
      ],
      "assignmentNote": "Line up 10-12 yards off the ball, left half of the field. Nothing behind you — you're the last line on this side. Key: the quarterback's eyes and shoulders."
    },
    {
      "positionId": "RD",
      "rosterPlayerId": null,
      "start": { "xYards": 22, "yYards": 12 },
      "route": [
        { "t": 0, "xYards": 22, "yYards": 12 },
        { "t": 1, "xYards": 22, "yYards": 12 }
      ],
      "assignmentNote": "Line up 10-12 yards off the ball, right half of the field. Nothing behind you — you're the last line on this side. Key: the quarterback's eyes and shoulders."
    }
  ],
  "ball": { "mode": "auto", "carrierEvents": [] }
}
```

Notes:
- `xYards`/`yYards` here use the same play-relative convention as §4/§5 (`x = 0` at the left sideline, `y = 0` at this play's own line of scrimmage, positive downfield) — so this play renders correctly no matter what absolute yard line it's placed at.
- The `RUSH` defender's `xYards: 13.5` (versus a perfectly centered `15`) is deliberate — it shades the rush lane slightly off-center so it doesn't run straight through the Center.
- `ball.carrierEvents` is empty on defensive plays — the ball isn't rendered as being "with" any defender. The viewer (§8) should simply not draw a ball at all when `play.side === "defense"`.
- Flip/Mirror (§8.5) works on this play like any other — a mirrored copy is just LD/RD and LU/RU swapping sides, which is a useful sanity check that flipping is working correctly, since a 2-deep shell is symmetric and should look identical before and after.

---

## 8. Play Viewer / Animation Engine

This should be a reusable component used both in the full-page viewer (`play-viewer.html`) and embedded in the editor for instant preview.

### 8.1 Playback Controls

- Play / Pause button.
- Scrub bar (timeline slider) spanning `0` to `play.durationSeconds` — dragging it at any time freezes the animation at that exact instant, showing all 5 players and the ball exactly where they'd be.
- Step forward / step back by a small time increment (e.g., 0.1s) for frame-by-frame review.
- Speed control: at least 0.5x, 1x, 1.5x (real-time playback speed multiplier).
- Restart button (jump to `t=0`).
- Current time readout (e.g., "1.4s / 5.0s").

### 8.2 View Modes

Two view modes, toggle button between them:

1. **Top-down (bird's eye), to scale** — the primary/default view. Straightforward orthographic rendering of the yard-based coordinates onto the SVG field from §5.
2. **Field-level, defense's perspective** — see §8.4.

### 8.3 Role Legend Panel

- Alongside the field (below it on mobile, beside it on desktop), show a panel listing each of the 5 players with their position label, assigned player name (if set), and their `assignmentNote`.
- As the play animates (or when frozen via the scrub bar), highlight/emphasize whichever player is currently the ball carrier, and optionally auto-scroll or bold their row, so a parent can follow "who has the ball right now."
- This is the primary teaching aid for the kids/parents — prioritize clarity here over visual flourish.
- This panel is the always-visible counterpart to the on-field hover/tap interaction in §8.7 — hovering/tapping a player on the field should highlight that same player's row here too, and vice versa, so the two stay in sync as one teaching tool rather than feeling like two separate features.

### 8.4 Field-Level Defense-Perspective View (Stylized 2D)

Build this as a **2D pseudo-perspective illustration**, not a 3D engine:

- Frame the view as if standing behind the defense's line, looking across the line of scrimmage toward the offense.
- Use a simple perspective approximation:
  - Map each player's downfield distance (`yYards` from the viewer) to a **vertical screen position** (farther downfield = higher on screen) and to a **scale factor** (farther downfield = smaller, using something like `scale = baseScale / (1 + distance * k)` for a tunable constant `k`).
  - Map each player's `xYards` (left/right) to horizontal screen position, also narrowing slightly toward the "vanishing point" as distance increases (multiply the horizontal offset from center by the same scale factor) to sell the depth illusion.
  - Render players as simple labeled tokens/avatars (colored circle + jersey number or initials, same visual language as the top-down view for consistency) at their computed screen position/scale.
  - Render the ball the same way, using its computed yard position from the ball logic in §7.3, mapped through the same projection.
  - Draw simple ground reference lines (e.g., yard lines) using the same projection so the sense of depth is reinforced.
- This view uses the exact same underlying timeline/keyframe data as the top-down view — only the projection function differs. All playback controls (§8.1) work identically in both views.

### 8.5 Flip / Mirror

- A "Flip" toggle/button that mirrors the entire play left-to-right:
  - Transform every `xYards` value (players' start positions, routes, and ball manual routes if present) as `x' = fieldWidthYards - x`.
  - Leave `yYards` and all timing (`t`) untouched.
  - If position labels or assignment notes contain directional words like "left"/"right", swap them in the mirrored copy's display (simple string replacement is fine; don't over-engineer this).
- Flipping should be available both as a **live view toggle** (temporarily mirror the current play for viewing/teaching without altering the saved play) and as a **"Flip & Save As New"** action from the play library (§7.1) that persists a new, separate play record — since a coach will often want both the "run it right" and "run it left" versions saved individually to call in a game.

### 8.6 Label Toggle

- A control to switch all on-field labels between: position abbreviation (C/QB/X/Y/Z on offense, RUSH/LU/RU/LD/RD on defense), jersey number, and player name — usable in both view modes.

### 8.7 Hover / Tap to Inspect a Player

This is the second primary teaching aid alongside the Role Legend (§8.3) — instead of (or in addition to) reading down a list, a parent or kid can point straight at a player on the field and immediately see what that player does.

- **Trigger:** mouse hover on desktop; tap on touch devices (most parents will be on a phone, so tap must work identically to hover, not be a degraded fallback). Works in both view modes (§8.2) and at any playback state — paused at `t=0`, mid-scrub, or after the play has finished.
- **On trigger, for the hovered/tapped player:**
  1. Draw that player's **entire route for the play** as a static line overlaid on the field — not just what's happened up to the current scrub time — using the same `route` array already stored for that player (§4/§7.3). Render it as a clean, coach's-whiteboard-style line: a solid stroke for a real path, ending in a small arrowhead at the route's final point. If a fake-handoff/fake-pass event applies to this player (§7.3), render that portion of the line dashed to visually match the "faking" treatment on their token, so the line itself communicates "this part isn't real."
  2. **Dim every other player's token and route** (e.g., to ~30% opacity) so the selected player's path reads clearly against the rest of the field, then restore full opacity when the hover/tap ends.
  3. Show a small **info box** near the player (desktop: follows the cursor/token; mobile: anchored to the bottom of the field so it doesn't sit under a finger) containing: position label (or jersey/name, matching the current Label Toggle setting, §8.6), and the player's `assignmentNote` text in full — the same plain-language description already used in the Role Legend panel, so the two sources of truth never drift apart.
  4. Sync the corresponding row in the Role Legend panel (§8.3) as described there.
- **Dismissal:** moving the mouse off the player (desktop) or tapping the same player again / tapping empty field space (touch) clears the highlight and restores normal full-opacity view.
- **Defensive plays:** the same interaction works on the seeded 2-Deep Shell (§7.5) and any other defensive play — since those routes are just a hold position, the info box is what carries the real content (the assignment note), and the "route line" may be a single dot rather than a path, which is expected and fine.
- **Nice-to-have:** the same hover/tap behavior in the Play Editor's live preview (§7.2), so the coach gets the identical inspection tool while building a play, not just while viewing a finished one.

---

## 9. Drills Library & Practice Schedule

### 9.1 Drills Library (`drills.html`)

A reusable catalog of drills, so the coach builds each drill once and reuses it week after week instead of retyping instructions every practice.

- List of saved drills, filterable by **category**: Warmup, Offense, Defense, Conditioning, Ball-Handling, Agility, Other (from `settings`-style editable list, same pattern as position labels).
- Each drill has: name, a plain-language description written so **another parent-coach who wasn't there when you designed it could run it cold** (step-by-step is fine), a suggested duration in minutes, and an optional list of linked plays (`linkedPlayIds`) it's meant to reinforce (e.g., a "Snap-Handoff Reps" drill linked to your handoff plays, or a "Man Coverage Shuffle" drill linked to your zone/man defensive plays).
- When a drill has linked plays, show quick links to view those plays (reusing the Play Viewer, §8) right from the drill's detail view — useful for a parent-coach who needs a refresher on exactly what the drill is building toward.
- Add/edit/delete drills; changes autosave the same way as roster/plays (§10).

### 9.2 Practice & Game Schedule (`schedule.html`)

- List of upcoming (and past) events, each with a **type** (Practice or Game), date, start time, and location; games also take an optional opponent name.
- Create/edit an event: add itinerary blocks **in order, down to the minute** — each block has a label (free text, e.g., "Warm-up," "Water Break," "Play Walkthrough: Sweep Right," "Scrimmage," "Cool-down") and a duration in minutes (any value, including single minutes, for coaches who want a tight to-the-minute schedule). (Itinerary blocks are optional for Game entries — a game may just need date/time/location/opponent/captains.)
- **Link a drill or a play to any itinerary block** (optional `linkedDrillId` and/or `linkedPlayId` — a block can reference either, both, or neither): when a drill is linked, show its full instructions inline (or a "View Drill" expand) so whoever is running that station has everything they need without you there; when a play is linked, show a "View Play" link/button that jumps straight to that play in the viewer (§8). This is how a block like "6:15–6:25 — Handoff Reps (Drill: Snap-Handoff Reps → practices Sweep Right & Sweep Left)" gets built.
- **Weekly captains:** each event (practice or game) supports assigning exactly **2 captains** from the roster via dropdowns (`captainRosterPlayerIds`). Display the current captains prominently at the top of that event (e.g., "This week's captains: Jake M. & Priya S.") and on the Home dashboard for the next upcoming event. Include a small "Copy captains to next event" action so the coach can set them once for the practice and reuse them for that week's game (or vice versa) without re-picking.
- Auto-calculate and display each block's start/end time and the total event length, based on the event's start time + sum of block durations in order — so a fully-detailed, minute-by-minute plan (e.g., 15 blocks across an hour) always shows correct clock times for every block.
- Print-friendly layout (clean print stylesheet) so the coach — or another coach — can print a paper itinerary to bring to the field.
- Simple upcoming/past sorting on the list view (e.g., soonest event first).
- **Who can see this:** any visitor to the published site (including other coaches/dads with no login) sees the same current week's plan read-only, per the publish workflow in §10 — only the coach editing on their own device can change it, then publish. If it later turns out other coaches need to edit it themselves from their own devices, flag that back to Claude Code — it changes the storage design in §10 from a single local editor to some form of shared online storage, which is a bigger change than the current build assumes.

---

## 10. Data Persistence & the "Publish" Workflow

This is important — read carefully, since it reconciles "public website" with "in-browser editing."

**The core issue:** `localStorage` is per-browser and per-device. If the coach edits the roster/plays/schedule on their own laptop, those edits are invisible to a parent visiting the same public URL on their phone — the parent's browser has its own separate (empty/default) `localStorage`.

**The resolution — a simple "publish by export" model:**

1. The site ships with a **published data file** committed to the project, e.g., `data/team-data.json`, matching the schema in §4. This is what loads by default for any visitor (coach or parent) who has no local edits yet.
2. When the coach makes edits (roster, plays, schedule) in their own browser, those edits autosave to `localStorage` immediately, so they aren't lost on refresh — this is the coach's **working copy**.
3. When the coach is ready to make their changes visible to everyone, they use an **Export** button (in Settings) to download the current working copy as `team-data.json`.
4. The coach (or Claude Code, when asked) replaces `data/team-data.json` in the project with that exported file and redeploys the static site (e.g., commits and pushes, triggering GitHub Pages/Netlify to rebuild).
5. All visitors — including the coach on a fresh browser/device — now see the updated published data by default.
6. An **Import** button (also in Settings) lets the coach load a `team-data.json` file back into their browser's working copy — useful for restoring a backup or continuing edits on a different device.

Implementation notes for the app logic:

- On load, the app should: check `localStorage` for existing working-copy data; if present, use it; otherwise, fetch and use `data/team-data.json`.
- Every edit (roster, play, schedule) writes back to `localStorage` immediately (simple autosave, no explicit "save" button needed for day-to-day editing).
- Provide a clear, visible "Reset to Published Version" action (discards local edits, reloads from `data/team-data.json`) for when the coach wants to discard in-progress changes.
- Make the Export/Import + "how publishing works" flow clearly explained in the Settings page UI itself (a short help blurb), since this is a manual step the coach needs to remember to do after editing.
- This design intentionally avoids any backend, login, or paid service — it fits a single-coach-editor, many-read-only-viewers use case at zero cost.

---

## 11. Site Map / Navigation

- **Home/Dashboard (`index.html`):** team name/colors, next upcoming practice or game at a glance (including that week's 2 captains, if set), quick links to Plays and Schedule.
- **Roster (`roster.html`)**
- **Plays (`plays.html`)** — library, filterable by Offense/Defense and tags.
- **Play Editor (`play-editor.html`)** — create/edit a play (formation, routes, ball logic, assignment notes); includes a live preview using the viewer component.
- **Play Viewer (`play-viewer.html`)** — full-screen animated viewing experience for a single play, for parents/kids to study.
- **Drills (`drills.html`)** — drill library, filterable by category, each optionally linked to the plays it reinforces.
- **Schedule (`schedule.html`)** — practice/game list + minute-by-minute itinerary builder (drill- and play-linked blocks) + print view.
- **Settings (`settings.html`)** — team info, field dimensions, position labels, Export/Import, Reset to Published Version.
- Persistent simple top nav (or bottom nav bar on mobile) linking these sections; highlight current page.

---

## 12. Visual/UX Style Guidelines

- **Mobile-first:** most parents/kids will view on phones. Design layouts to work well at ~375px width first, then progressively enhance for tablet/desktop.
- **Team colors:** pull from `team.primaryColor`/`secondaryColor` in settings for accents (nav bar, buttons, highlights); keep the field itself realistic green/white regardless of team colors.
- **Clarity over decoration:** this is a teaching tool for 9-10 year-olds and their parents — favor big, legible labels, clear contrast, and simple iconography (e.g., a small football icon for the ball) over elaborate graphics.
- **Accessibility:** sufficient color contrast, large enough tap targets for kids/parents on phones, and don't rely on color alone to distinguish offense vs. defense (also use shape or label).
- **Print styles:** at minimum, the Schedule page should have a `@media print` stylesheet that hides navigation/chrome and produces a clean printable itinerary.

---

## 13. Deployment

- Recommend **GitHub Pages** as the default target (free, simple, matches "push to publish" workflow in §10): a static site with no build step deploys directly from the repo.
- Document the steps in a `README.md` for the coach: how to make edits, how to export/publish (§10), and how to redeploy (e.g., `git add`, `git commit`, `git push`, or dragging a folder into Netlify if that's used instead).
- Ensure all asset paths are relative so the site works correctly whether hosted at a root domain or a GitHub Pages subpath (e.g., `username.github.io/team-name/`).

---

## 14. Suggested Build Order (non-binding)

Provided as a helpful default sequence — reorder as you see fit:

1. Project scaffold, shared CSS/JS structure, data store module (localStorage + fetch-fallback per §10), and the field-rendering module (to-scale SVG field per §5).
2. Roster management page.
3. Play editor: formation setup + drag-to-position (§7.2).
4. Route drawing + timeline/keyframes for players (§7.3, player routes only).
5. Ball logic (auto mode: snap → handoff/pass, no scramble — the QB can't run, §2/§7.3) layered on top of player routes (§7.3).
6. Play viewer: playback controls, scrub/freeze, top-down view, role legend (§8.1–8.3).
7. Flip/mirror (§8.5) and label toggle (§8.6).
8. Field-level defense-perspective view (§8.4) — do this after top-down is solid, since it reuses the same data.
9. Play library page with filters, duplicate/flip-and-save-as-new (§7.1).
10. Practice schedule & itinerary builder, with play linking and print styles (§9).
11. Settings page: field/position config, team info, Export/Import, Reset to Published (§2, §10).
12. Polish pass: mobile responsiveness, accessibility, README/deployment docs (§12–13).

---

## 15. Acceptance Checklist

Use this to verify the build before considering it "done." Each item should be manually verifiable in a browser.

- [ ] Can add/edit/delete roster players; changes persist after a page refresh (via `localStorage`).
- [ ] Can create a new offensive play, place all 5 players on a to-scale field, and draw a route for each.
- [ ] Can configure a snap → handoff play; playing it back shows the ball moving center → QB → Y (or Z), following that player's route afterward.
- [ ] Can configure a snap → pass play; playing it back shows the ball moving center → QB, then arcing to X, Y, or Z at the correct time, then following that receiver's route afterward.
- [ ] Can create a defensive play with 5 defenders and routes/assignment notes (e.g., a rusher and 4 zone assignments); "Scramble" does not appear anywhere as a selectable ball-event type (§2, §7.3).
- [ ] The seeded 2-Deep Shell (Cover 2) defensive play (§7.5) is present in the Play Library on first load, with RUSH/LU/RU/LD/RD correctly positioned and each showing its assignment note.
- [ ] Starting a new offensive play offers "Start from Power" and "Start from Spread," each correctly pre-placing C/QB/X/Y/Z per the coordinates in `settings.formations` (§4) — and in both, X is left of Y, which is left of Z.
- [ ] Playback controls work: play, pause, scrub to any point (correctly freezes all players and the ball at that instant), step frame-by-frame, and change speed.
- [ ] Can toggle between top-down view and field-level defense-perspective view for the same play, with playback state preserved across the toggle.
- [ ] Role legend panel shows all 5 players' assignment notes and highlights the current ball carrier as the play progresses.
- [ ] Flip/mirror correctly reflects every player's positions and routes left-to-right, leaves timing unchanged, and works both as a temporary view toggle and as a "save as new" action.
- [ ] Label toggle correctly switches between position, jersey number, and player name in both view modes.
- [ ] Practice schedule: can create a practice or game, add itinerary blocks down to the minute, see correct auto-calculated start/end times for every block, link a block to a drill and/or a play, and print a clean itinerary.
- [ ] Can create a drill in the Drills Library with a category and description, link it to one or more plays, and open those plays from the drill's detail view.
- [ ] A parent-coach with no login, visiting the published site fresh, can see the current week's full itinerary (including any linked drills/plays) exactly as last published — and cannot edit it.
- [ ] Hovering (desktop) or tapping (touch) a player on the field draws that player's full route as a static line with an arrowhead, dims the other four players, and shows an info box with their position and assignment note (§8.7); the corresponding Role Legend row highlights in sync, and the interaction is dismissible and re-triggerable.
- [ ] Export downloads a valid `team-data.json`; Import correctly loads a previously exported file back into the working copy.
- [ ] "Reset to Published Version" correctly discards local edits and reloads `data/team-data.json`.
- [ ] Site is usable and readable on a phone-width screen (375px) for every page, especially the Play Viewer and Schedule.
- [ ] Site deploys successfully to GitHub Pages (or chosen static host) and works at the deployed URL, not just locally.
- [ ] Full field renders to scale at 30 x 70 yards (50-yard playing field + two 10-yard end zones), green surface, thin white boundary/goal/yard lines every 5 yards, and a fixed red dotted first-down line at midfield (the 25-yard mark from either goal line).
- [ ] Building/viewing a defensive play shows a distinct dashed "No-Rush Line" 7 yards downfield of that play's line of scrimmage, in a color other than red/white/green.
- [ ] No "block"/"blocking" language appears anywhere in default or sample assignment notes or UI copy; the default non-ball-carrier note reflects "hold position" once the ball crosses the line of scrimmage.
- [ ] Can assign exactly 2 captains from the roster to a practice or game entry; the current captains display correctly on that event and on the Home dashboard for the next upcoming event.
- [ ] Configuring a fake handoff or fake pass shows the decoy player in a distinct visual state (color/icon/outline) for exactly its time window, without moving the ball, and that state renders correctly when paused or scrubbed to any frame inside the window.

---

## 16. Open Questions for the Coach (fill in before or during the build)

- Team name and colors.
- Preferred hosting choice: GitHub Pages vs. Netlify vs. Vercel (any are fine; GitHub Pages assumed unless told otherwise).
