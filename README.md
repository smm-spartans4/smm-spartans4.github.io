# SMM Spartans — Team Site

A static, no-backend team website: an interactive play diagrammer and a
practice/game scheduler. Built to the brief in `flag-football-app-spec.md`.

- **Coach** edits everything in the browser; edits autosave to that browser.
- **Parents and kids** visit the public URL and see the last *published* version.
- No accounts, no server, no database, nothing to pay for.

---

## Running it locally

Just double-click `index.html`. Everything works from `file://` — there is no
build step and no local server needed.

## How publishing works

`localStorage` lives in one browser on one device. Your edits are invisible to
parents until you publish them. Publishing is three steps:

1. In the site, go to **Settings → Export Publish File**. You get `team-data.js`.
2. Replace `data/team-data.js` in this folder with the downloaded file.
3. Commit and push. The live site updates for everyone.

**Settings → Export Backup** gives you a `team-data.json` instead — use that for
backups, or to carry your working copy to another device via **Import**.

**Settings → Reset to Published Version** throws away this browser's local edits
and reloads whatever is in `data/team-data.js`.

> The spec called for the published file to be `team-data.json`, loaded with
> `fetch()`. It is a `.js` file here instead, because `fetch()` is blocked on
> `file://` — with JSON, the site would only work once deployed and would break
> when you open it locally. The `.js` wrapper is the same data, and it works
> both ways. Import still accepts either format.

## Publishing to parents

Your work saves in your browser only. Parents see the last *published*
version. To publish:

1. On the site: **Publish -> Export publish file**
2. Double-click **publish.bat** in this folder

That is the whole job. It finds the newest export in Downloads, checks it,
installs it and pushes. GitHub rebuilds within a minute.

It takes the newest file by timestamp rather than a fixed name, because
Chrome never overwrites a download - the second is , the
third . And it refuses to publish anything it cannot parse, so a
half-written export can never reach the live site.

The site itself is at **https://smm-spartans4.github.io/**, hosted free by
GitHub Pages from .

### If you change the code rather than the data



---

## Project layout

```
index.html          Dashboard — next event, captains, weekly lineup
roster.html         Player list
plays.html          Play library
play-editor.html    Build a play
play-viewer.html    Animated playback
schedule.html       Practices/games + itineraries
settings.html       Field config, team info, export/import

css/base.css        All shared styles (mobile-first)
js/store.js         Data: load, autosave, export/import, lookups
js/field.js         To-scale SVG field + the coordinate system
js/ui.js            Nav bar, team colors
data/team-data.js   THE PUBLISHED DATA — replace this to publish
```

## Coordinates (important if you ever edit data by hand)

Everything is in **yards**, never pixels.

- **Absolute field:** `x` 0 → 30 left sideline to right. `y` 0 at the back of our
  own end zone, 10 = our goal line, 35 = midfield/first-down line, 60 = their
  goal line, 70 = back of their end zone. The offense always drives toward +y
  (up the screen).
- **Inside a play:** `y = 0` is *that play's* line of scrimmage, negative behind
  it. That way a play can be run from anywhere on the field without redrawing.
  `absoluteY = 10 + play.lineOfScrimmageYard + relativeY`.

## Coach mode

The site is read-only by default. Editing appears only where the coach has
switched it on:

    https://smm-spartans4.github.io/?coach=1

That sets a flag in that browser and stays until it is turned off (Settings →
Coach mode, or ?coach=0). Parents get: watch plays with flip, labels, the
announcer and MP4 download; read the roster; read the schedule and lineups;
print an itinerary; install the app; and reset to the published version if
their copy ever looks wrong. They get no add, edit, delete or reorder anywhere.

This is a guardrail, not a lock. A static site has no server to check a
password against, so any password would be checked in JavaScript that anyone
can read - protection in appearance only. What it actually prevents is a
parent or a kid changing their own copy by accident and concluding the site is
broken. Nobody but the coach can change what is published, with or without it.

## Build progress

All built and deployed.

- [x] **1.** Scaffold, data store, to-scale field renderer
- [x] **2.** Roster, with warrior portraits
- [x] **3.** Play editor: formations + drag to position
- [x] **4.** Hand-drawn routes
- [x] **5.** Ball logic (snap → handoff/pass, fakes, QB rollout)
- [x] **6.** Play viewer: playback, scrub, role legend
- [x] **7.** Flip/mirror + label toggle
- [x] **9.** Play library with thumbnails and manual ordering
- [x] **10.** Schedule: practices, games, two-deep lineups, print
- [x] **11.** Publish page: export, import, reset, field and league rules
- [x] **12.** Deployed to GitHub Pages
- [x] **13.** Download any play as an MP4
- [x] **14.** Installable offline app (PWA)
- [x] **15.** Announcer — speaks the play, fills in this week’s names
- [x] **16.** Coach mode — the site is read-only unless editing is switched on
- [x] **17.** Zone bubbles and the Cobra call, for defensive plays

- [x] **18.** Three-player drills - a lens on a play, never a copy of one
- [x] **19.** League rules on the Schedule page, with the OSAA PDF behind them
- [x] **20.** Rotation coverage grid - who has played where, and where nobody has

Dropped along the way: the pseudo-3D field-level view (step 8), which would
have been a lot of geometry for a picture the top-down view already gives.
A reusable drills catalogue was dropped and then rebuilt as something
better - drills now point at plays rather than duplicating them.

Notes on the video and the offline app:
- MP4 is encoded in the browser (WebCodecs + the muxer in js/mp4.js). No
  server, no build step. H.264/MP4 specifically, because iPads will not play
  WebM. The video is silent - browsers cannot capture synthesized speech.
- The offline app needs HTTPS, so it works from the published site, not from
  a local file.
- A downloaded video is a snapshot: change a route later and re-export it.
  The offline app is always current with whatever was last published.

## League rules baked in

- 30 × 70 yard field (50-yard playing field + two 10-yard end zones)
- Possession starts at your own 5; first down at midfield (the 25)
- Rushers must start 7 yards off the ball (the "rush line")
- **No blocking or screening, ever** — no "block" language anywhere in the app
- **The QB can never run** — no "scramble" ball event exists
- X / Y / Z are alignment labels: X is always left-most, Z always right-most
- **The Center is an eligible receiver** and can run a route
