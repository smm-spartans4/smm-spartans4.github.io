/* ============================================================================
   PUBLISHED TEAM DATA  —  the version every visitor sees by default.
   ----------------------------------------------------------------------------
   To publish your changes: Settings -> Export Publish File, then replace THIS
   file with the downloaded one and push to GitHub. See README.md.

   Do not hand-edit this file unless you know what you're doing — the site
   rewrites it for you on export.
   ========================================================================== */
window.PUBLISHED_TEAM_DATA = {
  "schemaVersion": 5,
  "team": {
    "name": "SMM Spartans",
    "primaryColor": "#17401A",
    "secondaryColor": "#FFFFFF",
    "season": "Fall 2026"
  },
  "settings": {
    "fieldWidthYards": 30,
    "playingFieldLengthYards": 50,
    "endZoneDepthYards": 10,
    "firstDownLineYards": 25,
    "defaultStartingYardLine": 5,
    "noRushZoneYards": 7,
    "passSpeedYardsPerSecond": 14,
    "snapDurationSeconds": 0.3,
    "offensePositions": [
      { "id": "C",  "label": "Center" },
      { "id": "QB", "label": "Quarterback" },
      { "id": "X",  "label": "X — always the left-most skill player" },
      { "id": "Y",  "label": "Y — always the middle skill player" },
      { "id": "Z",  "label": "Z — always the right-most skill player" }
    ],
    "defensePositions": [
      { "id": "RUSH", "label": "Rusher" },
      { "id": "LU",   "label": "Left Under" },
      { "id": "RU",   "label": "Right Under" },
      { "id": "LD",   "label": "Left Deep" },
      { "id": "RD",   "label": "Right Deep" }
    ],
    "lineupGroups": { "offense": 4, "defense": 2 },
    "passEligiblePositions": ["C", "X", "Y", "Z"],
    "handoffEligiblePositions": ["X", "Y", "Z"],
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
    { "id": "p01", "name": "Player 1",  "jersey": "1" },
    { "id": "p02", "name": "Player 2",  "jersey": "2" },
    { "id": "p03", "name": "Player 3",  "jersey": "3" },
    { "id": "p04", "name": "Player 4",  "jersey": "4" },
    { "id": "p05", "name": "Player 5",  "jersey": "5" },
    { "id": "p06", "name": "Player 6",  "jersey": "6" },
    { "id": "p07", "name": "Player 7",  "jersey": "7" },
    { "id": "p08", "name": "Player 8",  "jersey": "8" },
    { "id": "p09", "name": "Player 9",  "jersey": "9" },
    { "id": "p10", "name": "Player 10", "jersey": "10" }
  ],
  "plays": [
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
          "start": { "xYards": 13.5, "yYards": 7.9 },
          "route": [
            { "t": 0, "xYards": 13.5, "yYards": 7.9 },
            { "t": 1, "xYards": 13.5, "yYards": 7.9 }
          ],
          "assignmentNote": "Line up just BEHIND the rush line - 7 yards off the ball is the closest you may start - shaded just left of center. Rush straight upfield at the snap — get skinny, get home, no looping wide."
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
  ],

  "practices": [
    {
      "id": "evt-sample",
      "type": "practice",
      "date": "2026-09-08",
      "startTime": "17:30",
      "location": "TBD",
      "opponent": "",
      "captainRosterPlayerIds": [],
      "unavailableRosterPlayerIds": [],
      "lineup": { "C": [], "QB": [], "X": [], "Y": [], "Z": [],
                  "RUSH": [], "LU": [], "RU": [], "LD": [], "RD": [] },
      "itinerary": []
    }
  ]
};
