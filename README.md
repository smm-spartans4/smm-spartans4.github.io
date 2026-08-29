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

## Deploying

The site is live at **https://smm-spartans4.github.io/**, hosted free by
GitHub Pages out of the repo `smm-spartans4/smm-spartans4.github.io`.
Pages is already configured, so publishing is just:

```bash
git add .
git commit -m "what changed"
git push
```

GitHub rebuilds within a minute or so. Remember that pushing code is not the
same as publishing your plays — for those, export from Settings first and
replace `data/team-data.js` (see above).

The repo is named after the org on purpose: a repo called
`<org>.github.io` is served at the apex URL instead of under a
`/repo-name/` path. All asset paths are relative, so the site works either way.

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

## Build progress

- [x] **1.** Scaffold, data store, to-scale field renderer
- [x] **2.** Roster
- [x] **3.** Play editor: formations + drag to position
- [x] **4.** Hand-drawn routes
- [x] **5.** Ball logic (snap → handoff/pass, fakes, QB rollout)
- [x] **6.** Play viewer: playback, scrub, role legend
- [x] **7.** Flip/mirror + label toggle
- [ ] **9.** Play library with filters
- [x] **10.** Schedule: practices, games, weekly lineups, print
- [x] **11.** Settings + export/import (pulled forward - backups matter)
- [ ] **12.** Polish, accessibility, deploy to GitHub Pages
- [ ] **13.** Download any play as an MP4 (coach and parents) — for saving to an iPad
- [ ] **14.** Installable offline app (PWA) — Add to Home Screen, works with no signal

Notes on 13 and 14:
- MP4 is encoded in the browser (WebCodecs + a vendored muxer). No server, no build step.
  H.264/MP4 specifically, because iPads will not play WebM.
- The offline app needs HTTPS, so it only works once deployed (step 12) — not from `file://`.
- A downloaded video is a snapshot: change a route later and it must be re-exported.
  The offline app is always current with whatever was last published.

## League rules baked in

- 30 × 70 yard field (50-yard playing field + two 10-yard end zones)
- Possession starts at your own 5; first down at midfield (the 25)
- Rushers must start 7 yards off the ball (the "rush line")
- **No blocking or screening, ever** — no "block" language anywhere in the app
- **The QB can never run** — no "scramble" ball event exists
- X / Y / Z are alignment labels: X is always left-most, Z always right-most
- **The Center is an eligible receiver** and can run a route
