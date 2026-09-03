/* ==========================================================================
   PUBLISHED TEAM DATA - the version every visitor sees by default.
   Exported 2026-09-03T18:27:42.752Z
   Replace data/team-data.js with this file and push. See README.md.
   ======================================================================== */
window.PUBLISHED_TEAM_DATA = {
  "schemaVersion": 7,
  "team": {
    "name": "SMM Spartans Football",
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
      {
        "id": "C",
        "label": "Center"
      },
      {
        "id": "QB",
        "label": "Quarterback"
      },
      {
        "id": "X",
        "label": "X — always the left-most skill player"
      },
      {
        "id": "Y",
        "label": "Y — always the middle skill player"
      },
      {
        "id": "Z",
        "label": "Z — always the right-most skill player"
      }
    ],
    "defensePositions": [
      {
        "id": "RUSH",
        "label": "Rusher"
      },
      {
        "id": "LU",
        "label": "Left Under"
      },
      {
        "id": "RU",
        "label": "Right Under"
      },
      {
        "id": "LD",
        "label": "Left Deep"
      },
      {
        "id": "RD",
        "label": "Right Deep"
      }
    ],
    "passEligiblePositions": [
      "C",
      "X",
      "Y",
      "Z"
    ],
    "handoffEligiblePositions": [
      "X",
      "Y",
      "Z"
    ],
    "formations": [
      {
        "id": "power",
        "name": "Power",
        "side": "offense",
        "description": "X wide left on the line. Y and Z offset in the backfield — Y left, Z right and deeper.",
        "positions": {
          "C": {
            "xYards": 15,
            "yYards": 0
          },
          "QB": {
            "xYards": 15,
            "yYards": -2
          },
          "X": {
            "xYards": 10,
            "yYards": 0
          },
          "Y": {
            "xYards": 13,
            "yYards": -3.5
          },
          "Z": {
            "xYards": 18,
            "yYards": -4.5
          }
        }
      },
      {
        "id": "spread",
        "name": "Spread",
        "side": "offense",
        "description": "X wide left on the line. Y and Z both line up right — Y just off the ball inside, Z on the line outside.",
        "positions": {
          "C": {
            "xYards": 15,
            "yYards": 0
          },
          "QB": {
            "xYards": 15,
            "yYards": -1.5
          },
          "X": {
            "xYards": 11.5,
            "yYards": 0
          },
          "Y": {
            "xYards": 18.5,
            "yYards": 0
          },
          "Z": {
            "xYards": 24.5,
            "yYards": 0
          }
        }
      }
    ],
    "lineupGroups": {
      "offense": 4,
      "defense": 2
    },
    "defaultVoiceName": "Microsoft Guy Online (Natural)"
  },
  "roster": [
    {
      "id": "p01",
      "name": "Andrew Z",
      "jersey": "1"
    },
    {
      "id": "p02",
      "name": "Connor T",
      "jersey": "2"
    },
    {
      "id": "p03",
      "name": "Harry N",
      "jersey": "3"
    },
    {
      "id": "p04",
      "name": "Isaac O",
      "jersey": "4"
    },
    {
      "id": "p05",
      "name": "Jack K",
      "jersey": "5"
    },
    {
      "id": "p06",
      "name": "Joe D",
      "jersey": "6"
    },
    {
      "id": "p07",
      "name": "Jude B",
      "jersey": "7"
    },
    {
      "id": "p08",
      "name": "Jude D",
      "jersey": "8"
    },
    {
      "id": "p09",
      "name": "Teddy B",
      "jersey": "9"
    },
    {
      "id": "p10",
      "name": "Teddy P",
      "jersey": "10"
    }
  ],
  "plays": [
    {
      "id": "seed-cover-2-shell",
      "name": "2-Deep Shell (Cover 2)",
      "side": "defense",
      "tags": [
        "zone",
        "cover-2"
      ],
      "durationSeconds": 1,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "RUSH",
          "rosterPlayerId": null,
          "start": {
            "xYards": 13.5,
            "yYards": 7.9
          },
          "route": [
            {
              "t": 0,
              "xYards": 13.5,
              "yYards": 7.9
            },
            {
              "t": 1,
              "xYards": 13.5,
              "yYards": 7.9
            }
          ],
          "assignmentNote": "Line up just BEHIND the rush line. Rush straight upfield at the snap and go after the QB or ball carrier.  *If we yell COBRA, do not rush. Settle back in the deep middle."
        },
        {
          "positionId": "LU",
          "rosterPlayerId": null,
          "start": {
            "xYards": 9,
            "yYards": 4.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 9,
              "yYards": 4.5
            },
            {
              "t": 1,
              "xYards": 9,
              "yYards": 4.5
            }
          ],
          "assignmentNote": "Left Under. Line up 4-5 yards off the ball, left of center. Cover the flat and short middle on your side. Key: the running back first, then any receiver settling short."
        },
        {
          "positionId": "RU",
          "rosterPlayerId": null,
          "start": {
            "xYards": 21,
            "yYards": 4.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 21,
              "yYards": 4.5
            },
            {
              "t": 1,
              "xYards": 21,
              "yYards": 4.5
            }
          ],
          "assignmentNote": "Right Under. Line up 4-5 yards off the ball, right of center. Cover the flat and short middle on your side. Key: the running back first, then any receiver settling short."
        },
        {
          "positionId": "LD",
          "rosterPlayerId": null,
          "start": {
            "xYards": 8,
            "yYards": 12
          },
          "route": [
            {
              "t": 0,
              "xYards": 8,
              "yYards": 12
            },
            {
              "t": 1,
              "xYards": 8,
              "yYards": 12
            }
          ],
          "assignmentNote": "Left Deep. Line up 10-12 yards off the ball, left half of the field. Nothing behind you — you're the last line on this side. Key: the quarterback's eyes and shoulders."
        },
        {
          "positionId": "RD",
          "rosterPlayerId": null,
          "start": {
            "xYards": 22,
            "yYards": 12
          },
          "route": [
            {
              "t": 0,
              "xYards": 22,
              "yYards": 12
            },
            {
              "t": 1,
              "xYards": 22,
              "yYards": 12
            }
          ],
          "assignmentNote": "Right Deep. Line up 10-12 yards off the ball, right half of the field. Nothing behind you — you're the last line on this side. Key: the quarterback's eyes and shoulders."
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": []
      }
    },
    {
      "id": "4e0bd0cc-54f1-4ba2-8fba-4f75f98e00dd",
      "name": "Power Z Run",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 3.498,
              "xYards": 15.61,
              "yYards": 3.7
            },
            {
              "t": 4.828,
              "xYards": 16.74,
              "yYards": 4.57
            },
            {
              "t": 5,
              "xYards": 16.92,
              "yYards": 4.53
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, then release and find open space."
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -2
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -2
            },
            {
              "t": 5,
              "xYards": 15,
              "yYards": -2
            }
          ],
          "assignmentNote": "Take the snap, turn and fake a handoff to the Y. Handoff to the Z.  Roll right.   "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 10,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 10,
              "yYards": 0
            },
            {
              "t": 3.351,
              "xYards": 13.39,
              "yYards": 2.69
            },
            {
              "t": 4.365,
              "xYards": 14.52,
              "yYards": 3.35
            },
            {
              "t": 5,
              "xYards": 15.31,
              "yYards": 3.57
            }
          ],
          "assignmentNote": "Run your route to clear space for the Z. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 13,
            "yYards": -3.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 13,
              "yYards": -3.5
            },
            {
              "t": 1.208,
              "xYards": 14.56,
              "yYards": -1.48
            },
            {
              "t": 1.868,
              "xYards": 15.48,
              "yYards": -0.43
            },
            {
              "t": 2.671,
              "xYards": 16.7,
              "yYards": 0.75
            },
            {
              "t": 3.2,
              "xYards": 17.4,
              "yYards": 1.62
            },
            {
              "t": 3.849,
              "xYards": 18.53,
              "yYards": 2.4
            },
            {
              "t": 4.374,
              "xYards": 19.53,
              "yYards": 2.88
            },
            {
              "t": 5,
              "xYards": 20.84,
              "yYards": 3.06
            }
          ],
          "assignmentNote": "Fake as if you have the ball. Continue running into the right flat. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18,
            "yYards": -4.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 18,
              "yYards": -4.5
            },
            {
              "t": 1.374,
              "xYards": 14.3,
              "yYards": -2.04
            },
            {
              "t": 2.496,
              "xYards": 10.9,
              "yYards": -0.78
            },
            {
              "t": 3.32,
              "xYards": 8.55,
              "yYards": 0.48
            },
            {
              "t": 3.984,
              "xYards": 7.24,
              "yYards": 2.18
            },
            {
              "t": 4.625,
              "xYards": 6.46,
              "yYards": 4.1
            },
            {
              "t": 5,
              "xYards": 5.72,
              "yYards": 5.06
            }
          ],
          "assignmentNote": "Take the handoff and run hard and fast to the left side of the field. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 0.8,
            "type": "fake-handoff",
            "toPositionId": "Y",
            "durationSeconds": 0.6
          },
          {
            "t": 1.2,
            "type": "handoff",
            "toPositionId": "Z"
          }
        ]
      }
    },
    {
      "id": "a24afcd0-2029-4b93-a718-1b2cd8a5bcde",
      "name": "Power Pass",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 3.553,
              "xYards": 15.35,
              "yYards": 4.13
            },
            {
              "t": 4.156,
              "xYards": 15.96,
              "yYards": 4.48
            },
            {
              "t": 5,
              "xYards": 16.92,
              "yYards": 4.7
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, then release and find open space."
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -2
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -2
            },
            {
              "t": 2.172,
              "xYards": 14.26,
              "yYards": -2.22
            },
            {
              "t": 2.172,
              "xYards": 14.26,
              "yYards": -2.22
            },
            {
              "t": 3.143,
              "xYards": 14.43,
              "yYards": -2.52
            },
            {
              "t": 5,
              "xYards": 14.43,
              "yYards": -3.18
            }
          ],
          "assignmentNote": "Take the snap, fake the handoff to Y. Roll right, find an open receiver and throw. "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 10,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 10,
              "yYards": 0
            },
            {
              "t": 3.303,
              "xYards": 13.17,
              "yYards": 3.09
            },
            {
              "t": 4.349,
              "xYards": 14.3,
              "yYards": 3.92
            },
            {
              "t": 5,
              "xYards": 15,
              "yYards": 4.44
            }
          ],
          "assignmentNote": "Slant. Run fast and find open space in the area of your route. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 13,
            "yYards": -3.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 13,
              "yYards": -3.5
            },
            {
              "t": 1.208,
              "xYards": 14.56,
              "yYards": -1.48
            },
            {
              "t": 1.868,
              "xYards": 15.48,
              "yYards": -0.43
            },
            {
              "t": 2.671,
              "xYards": 16.7,
              "yYards": 0.75
            },
            {
              "t": 3.2,
              "xYards": 17.4,
              "yYards": 1.62
            },
            {
              "t": 3.849,
              "xYards": 18.53,
              "yYards": 2.4
            },
            {
              "t": 4.374,
              "xYards": 19.53,
              "yYards": 2.88
            },
            {
              "t": 5,
              "xYards": 20.84,
              "yYards": 3.06
            }
          ],
          "assignmentNote": "Fake as if you have the ball, then get open in the right flat. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18,
            "yYards": -4.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 18,
              "yYards": -4.5
            },
            {
              "t": 2.496,
              "xYards": 12.73,
              "yYards": -1.83
            },
            {
              "t": 3.506,
              "xYards": 10.47,
              "yYards": -1.05
            },
            {
              "t": 4.317,
              "xYards": 8.59,
              "yYards": -0.66
            },
            {
              "t": 5,
              "xYards": 7.11,
              "yYards": -0.01
            }
          ],
          "assignmentNote": "Run your route to the left flat. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 1,
            "type": "fake-handoff",
            "toPositionId": "Y",
            "durationSeconds": 0.6
          },
          {
            "t": 2.3,
            "type": "pass",
            "toPositionId": "C"
          }
        ]
      }
    },
    {
      "id": "3164952d-69f6-45ec-b1b4-cca5f36a166f",
      "name": "Spread X Run",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 2.655,
              "xYards": 15.09,
              "yYards": 4.04
            },
            {
              "t": 4.083,
              "xYards": 13.12,
              "yYards": 4.96
            },
            {
              "t": 5,
              "xYards": 11.88,
              "yYards": 5.6
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, then release and find open space."
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -1.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -1.5
            },
            {
              "t": 5,
              "xYards": 15.03,
              "yYards": -0.31
            }
          ],
          "assignmentNote": "Take the snap, immediately hand off to the X coming from the left. "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 12,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 12,
              "yYards": 0
            },
            {
              "t": 2.581,
              "xYards": 15.04,
              "yYards": -0.56
            },
            {
              "t": 3.057,
              "xYards": 15.61,
              "yYards": -0.56
            },
            {
              "t": 4.096,
              "xYards": 16.74,
              "yYards": -0.04
            },
            {
              "t": 5,
              "xYards": 17.66,
              "yYards": 0.53
            }
          ],
          "assignmentNote": "Run to the right, take the handoff in front of the QB. Run full speed into daylight. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 18.5,
              "yYards": 0
            },
            {
              "t": 5,
              "xYards": 15.87,
              "yYards": 3.74
            }
          ],
          "assignmentNote": "Run your route as shown to clear space for the ball carrier. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 24.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 24.5,
              "yYards": 0
            },
            {
              "t": 2.191,
              "xYards": 24.36,
              "yYards": 6.16
            },
            {
              "t": 3.431,
              "xYards": 21.24,
              "yYards": 7.72
            },
            {
              "t": 4.241,
              "xYards": 19.04,
              "yYards": 8.31
            },
            {
              "t": 5,
              "xYards": 17.02,
              "yYards": 9
            }
          ],
          "assignmentNote": "Run the route as shown to clear space for the ball carrier."
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 2.62,
            "type": "handoff",
            "toPositionId": "X"
          }
        ]
      }
    },
    {
      "id": "4fede1f8-d11c-4cec-bf63-dd041e945bfb",
      "name": "Spread X Pass",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 2.736,
              "xYards": 14.91,
              "yYards": 3.58
            },
            {
              "t": 5,
              "xYards": 12.04,
              "yYards": 4.32
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, then release and find open space."
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -1.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -1.5
            },
            {
              "t": 1.619,
              "xYards": 15.03,
              "yYards": -0.43
            },
            {
              "t": 4.157,
              "xYards": 15.84,
              "yYards": -1.9
            },
            {
              "t": 5,
              "xYards": 15.93,
              "yYards": -2.45
            }
          ],
          "assignmentNote": "Take the snap, fake the handoff to X. Find an open receiver and throw. "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 12,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 12,
              "yYards": 0
            },
            {
              "t": 1.268,
              "xYards": 15.04,
              "yYards": -0.56
            },
            {
              "t": 1.502,
              "xYards": 15.61,
              "yYards": -0.56
            },
            {
              "t": 2.012,
              "xYards": 16.74,
              "yYards": -0.04
            },
            {
              "t": 2.456,
              "xYards": 17.66,
              "yYards": 0.53
            },
            {
              "t": 3.879,
              "xYards": 18.4,
              "yYards": 3.92
            },
            {
              "t": 4.678,
              "xYards": 20.32,
              "yYards": 4.26
            },
            {
              "t": 5,
              "xYards": 21.1,
              "yYards": 4.18
            }
          ],
          "assignmentNote": "Fake as if you have the ball, then get open on the right side. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 18.5,
              "yYards": 0
            },
            {
              "t": 4.195,
              "xYards": 15.61,
              "yYards": 3.92
            },
            {
              "t": 5,
              "xYards": 14.78,
              "yYards": 4.35
            }
          ],
          "assignmentNote": "Slant. Run fast and find open space in the area of your route. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 24.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 24.5,
              "yYards": 0
            },
            {
              "t": 2.047,
              "xYards": 24.27,
              "yYards": 5.1
            },
            {
              "t": 3.553,
              "xYards": 20.97,
              "yYards": 6.89
            },
            {
              "t": 5,
              "xYards": 17.52,
              "yYards": 7.95
            }
          ],
          "assignmentNote": "Run route as shown into open space. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 1,
            "type": "fake-handoff",
            "toPositionId": "X",
            "durationSeconds": 0.6
          },
          {
            "t": 3.4,
            "type": "pass",
            "toPositionId": "Y"
          }
        ]
      }
    },
    {
      "id": "0cdb7b33-3d6f-4744-a2d8-87bc40f55954",
      "name": "Spread Y Run",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 2.377,
              "xYards": 15.17,
              "yYards": 4.01
            },
            {
              "t": 4.479,
              "xYards": 18.7,
              "yYards": 4.36
            },
            {
              "t": 5,
              "xYards": 19.58,
              "yYards": 4.36
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, then release and find open space."
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -1.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -1.5
            },
            {
              "t": 2.109,
              "xYards": 15.04,
              "yYards": -0.34
            },
            {
              "t": 3.931,
              "xYards": 14.56,
              "yYards": -1.22
            },
            {
              "t": 5,
              "xYards": 14.22,
              "yYards": -1.7
            }
          ],
          "assignmentNote": "Take the snap, hand off immediately to the Y coming from the right. "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 11.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 11.5,
              "yYards": 0
            },
            {
              "t": 5,
              "xYards": 6.37,
              "yYards": 7.58
            }
          ],
          "assignmentNote": "Run your route to the left-side corner. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 18.5,
              "yYards": 0
            },
            {
              "t": 1.259,
              "xYards": 15.83,
              "yYards": -0.61
            },
            {
              "t": 2.423,
              "xYards": 13.3,
              "yYards": -0.52
            },
            {
              "t": 3.459,
              "xYards": 11.79,
              "yYards": 1.15
            },
            {
              "t": 4.263,
              "xYards": 11.79,
              "yYards": 2.9
            },
            {
              "t": 5,
              "xYards": 11.88,
              "yYards": 4.5
            }
          ],
          "assignmentNote": "Run to the left, take the handoff in front of the QB. Run full speed into daylight. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 24.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 24.5,
              "yYards": 0
            },
            {
              "t": 5,
              "xYards": 24.36,
              "yYards": 8.08
            }
          ],
          "assignmentNote": "Run your route to the right-side corner. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 1.3,
            "type": "handoff",
            "toPositionId": "Y"
          }
        ]
      }
    },
    {
      "id": "9ed8fd04-2def-415b-a720-4a2c22799395",
      "name": "Spread Y Pass",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 3.087,
              "xYards": 15.37,
              "yYards": 5.33
            },
            {
              "t": 4.571,
              "xYards": 17.62,
              "yYards": 6.57
            },
            {
              "t": 4.763,
              "xYards": 17.94,
              "yYards": 6.48
            },
            {
              "t": 5,
              "xYards": 18.35,
              "yYards": 6.48
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, run straight and veer right into open space. "
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -1.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -1.5
            },
            {
              "t": 2.109,
              "xYards": 15.04,
              "yYards": -0.34
            },
            {
              "t": 3.931,
              "xYards": 14.56,
              "yYards": -1.22
            },
            {
              "t": 5,
              "xYards": 14.22,
              "yYards": -1.7
            }
          ],
          "assignmentNote": "Take the snap, fake the handoff to Y. Find an open receiver and throw. "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 11.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 11.5,
              "yYards": 0
            },
            {
              "t": 5,
              "xYards": 6.51,
              "yYards": 7.9
            }
          ],
          "assignmentNote": "Run your route to the deep left-side corner. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 18.5,
              "yYards": 0
            },
            {
              "t": 1.05,
              "xYards": 15.83,
              "yYards": -0.61
            },
            {
              "t": 2.021,
              "xYards": 13.3,
              "yYards": -0.52
            },
            {
              "t": 2.752,
              "xYards": 11.77,
              "yYards": 0.62
            },
            {
              "t": 3.918,
              "xYards": 12.2,
              "yYards": 3.63
            },
            {
              "t": 4.664,
              "xYards": 13.94,
              "yYards": 4.5
            },
            {
              "t": 5,
              "xYards": 14.77,
              "yYards": 4.78
            }
          ],
          "assignmentNote": "Fake as if you have the ball, get open over the middle. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 24.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 24.5,
              "yYards": 0
            },
            {
              "t": 5,
              "xYards": 24.59,
              "yYards": 8.82
            }
          ],
          "assignmentNote": "Run your route to the deep right-side corner. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 1,
            "type": "fake-handoff",
            "toPositionId": "Y",
            "durationSeconds": 0.8
          },
          {
            "t": 3,
            "type": "pass",
            "toPositionId": "Z"
          }
        ]
      }
    },
    {
      "id": "d244855a-6713-43a3-8c11-ebb61ce20014",
      "name": "Spread Free",
      "side": "offense",
      "tags": [],
      "durationSeconds": 5,
      "lineOfScrimmageYard": 5,
      "players": [
        {
          "positionId": "C",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": 0
            },
            {
              "t": 1.725,
              "xYards": 15.05,
              "yYards": 3.03
            },
            {
              "t": 1.884,
              "xYards": 15.05,
              "yYards": 3.31
            },
            {
              "t": 3.37,
              "xYards": 17.66,
              "yYards": 3.4
            },
            {
              "t": 4.556,
              "xYards": 19.73,
              "yYards": 3.63
            },
            {
              "t": 5,
              "xYards": 20.51,
              "yYards": 3.59
            }
          ],
          "assignmentNote": "Snap the ball to the quarterback, run your route as shown and find open space on the R side. "
        },
        {
          "positionId": "QB",
          "rosterPlayerId": null,
          "start": {
            "xYards": 15,
            "yYards": -1.5
          },
          "route": [
            {
              "t": 0,
              "xYards": 15,
              "yYards": -1.5
            },
            {
              "t": 2.357,
              "xYards": 16.26,
              "yYards": -2.96
            },
            {
              "t": 4.391,
              "xYards": 17.92,
              "yYards": -2.83
            },
            {
              "t": 5,
              "xYards": 18.31,
              "yYards": -2.52
            }
          ],
          "assignmentNote": "Take the snap, read the field. Find an open receiver and throw.  "
        },
        {
          "positionId": "X",
          "rosterPlayerId": null,
          "start": {
            "xYards": 11.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 11.5,
              "yYards": 0
            },
            {
              "t": 1.96,
              "xYards": 15.65,
              "yYards": 3.45
            },
            {
              "t": 2.366,
              "xYards": 16.66,
              "yYards": 3.93
            },
            {
              "t": 2.914,
              "xYards": 15.83,
              "yYards": 5.19
            },
            {
              "t": 3.681,
              "xYards": 13.78,
              "yYards": 5.71
            },
            {
              "t": 4.441,
              "xYards": 11.86,
              "yYards": 6.54
            },
            {
              "t": 5,
              "xYards": 10.51,
              "yYards": 7.28
            }
          ],
          "assignmentNote": "Run your route as shown and find open space. "
        },
        {
          "positionId": "Y",
          "rosterPlayerId": null,
          "start": {
            "xYards": 18.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 18.5,
              "yYards": 0
            },
            {
              "t": 1.957,
              "xYards": 15.22,
              "yYards": 4.93
            },
            {
              "t": 3.066,
              "xYards": 18.09,
              "yYards": 6.67
            },
            {
              "t": 4.004,
              "xYards": 20.84,
              "yYards": 7.37
            },
            {
              "t": 5,
              "xYards": 23.85,
              "yYards": 7.5
            }
          ],
          "assignmentNote": "Run your route as shown and find open space. "
        },
        {
          "positionId": "Z",
          "rosterPlayerId": null,
          "start": {
            "xYards": 24.5,
            "yYards": 0
          },
          "route": [
            {
              "t": 0,
              "xYards": 24.5,
              "yYards": 0
            },
            {
              "t": 2.532,
              "xYards": 24.41,
              "yYards": 8.02
            },
            {
              "t": 3.37,
              "xYards": 22.06,
              "yYards": 9.25
            },
            {
              "t": 4.409,
              "xYards": 18.79,
              "yYards": 9.64
            },
            {
              "t": 5,
              "xYards": 16.92,
              "yYards": 9.68
            }
          ],
          "assignmentNote": "Run your route as shown and find open space. "
        }
      ],
      "ball": {
        "mode": "auto",
        "carrierEvents": [
          {
            "t": 0,
            "type": "snap",
            "fromPositionId": "C",
            "toPositionId": "QB"
          },
          {
            "t": 3,
            "type": "pass",
            "toPositionId": "X"
          }
        ]
      }
    }
  ],
  "practices": [
    {
      "id": "evt-sample",
      "type": "practice",
      "date": "2026-09-04",
      "startTime": "13:15",
      "location": "Memorial Park",
      "opponent": "",
      "captainRosterPlayerIds": [],
      "unavailableRosterPlayerIds": [],
      "lineup": {
        "C": [
          null,
          null,
          null,
          null
        ],
        "QB": [
          null,
          null,
          null,
          null
        ],
        "X": [
          null,
          null,
          null,
          null
        ],
        "Y": [
          null,
          null,
          null,
          null
        ],
        "Z": [
          null,
          null,
          null,
          null
        ],
        "RUSH": [
          null,
          null
        ],
        "RU": [
          null,
          null
        ],
        "RD": [
          null,
          null
        ],
        "LD": [
          null,
          null
        ],
        "LU": [
          null,
          null
        ]
      },
      "itinerary": [],
      "endTime": "14:45"
    },
    {
      "id": "a6c66d2d-815b-4949-999b-36c53c294e9e",
      "type": "practice",
      "date": "2026-09-11",
      "startTime": "15:30",
      "location": "Memorial Park",
      "opponent": "",
      "captainRosterPlayerIds": [],
      "unavailableRosterPlayerIds": [],
      "lineup": {
        "C": [],
        "QB": [],
        "X": [],
        "Y": [],
        "Z": [],
        "RUSH": [],
        "LU": [],
        "RU": [],
        "LD": [],
        "RD": []
      },
      "itinerary": [],
      "endTime": "16:45"
    },
    {
      "id": "c1fff654-8535-4821-8c49-5d6f7cfc14ec",
      "type": "game",
      "date": "2026-09-12",
      "startTime": "09:00",
      "location": "Lamp Park #3",
      "opponent": "Ravens",
      "captainRosterPlayerIds": [],
      "unavailableRosterPlayerIds": [],
      "lineup": {
        "C": [],
        "QB": [],
        "X": [],
        "Y": [],
        "Z": [],
        "RUSH": [],
        "LU": [],
        "RU": [],
        "LD": [],
        "RD": []
      },
      "itinerary": [],
      "endTime": "10:00"
    },
    {
      "id": "a63b0698-3527-4146-b646-54b66bb32b8d",
      "type": "practice",
      "date": "2026-09-07",
      "startTime": "17:00",
      "endTime": "18:30",
      "location": "Memorial Park",
      "opponent": "",
      "captainRosterPlayerIds": [],
      "unavailableRosterPlayerIds": [],
      "lineup": {
        "C": [],
        "QB": [],
        "X": [],
        "Y": [],
        "Z": [],
        "RUSH": [],
        "LU": [],
        "RU": [],
        "LD": [],
        "RD": []
      },
      "itinerary": []
    }
  ],
  "drills": [
    {
      "id": "3b4d44c4-65de-4e73-bdda-137001ccac59",
      "name": "Power Z Run — drill",
      "playId": "4e0bd0cc-54f1-4ba2-8fba-4f75f98e00dd",
      "positions": [
        "QB",
        "Y",
        "Z"
      ],
      "notes": {
        "QB": "Check that the formation is correct. Hands out ready to receive. Catch snap, turn L. Immediately put the ball into the belly of the Y, and pull it out. Hand off to Z. ",
        "Y": "Hands on knees. Eyes on center. At the snap, move towards QB, accept the fake handoff. Continue running to R flat as if you have the ball. ",
        "Z": "Hands on knees. Eyes on center. At the snap, accept the handoff from QB. Run hard and fast into daylight on the L side. "
      },
      "description": "Speed is essential here. Fake to freeze the defense, then ball in Z's hands. Snap. Fake. Handoff. Bang-bang-bang no delays. Push for fast execution. "
    },
    {
      "id": "d398e782-a0d7-40d5-ae60-a4b19ed71620",
      "name": "Power Pass — drill",
      "playId": "a24afcd0-2029-4b93-a718-1b2cd8a5bcde",
      "positions": [
        "QB",
        "Y",
        "Z"
      ],
      "description": "",
      "notes": {
        "QB": "Check that the formation is correct. Hands out ready to receive. Catch snap, turn L. Immediately put the ball into the belly of the Y, and pull it out. Look for an open receiver and throw. ",
        "Y": "Hands on knees. Eyes on center. At the snap, move towards QB, accept the fake handoff. Run hard to the R flat to receive a pass.",
        "Z": "Hands on knees. Eyes on center. At the snap, bolt hard to the L flat ready to receive a pass. "
      }
    },
    {
      "id": "e9e8cafe-d34f-424c-bfe7-177a4339b487",
      "name": "Power Pass — drill",
      "playId": "a24afcd0-2029-4b93-a718-1b2cd8a5bcde",
      "positions": [
        "C",
        "QB",
        "X"
      ],
      "description": "",
      "notes": {
        "C": "Snap the ball to QB, run the route as shown, find open space. ",
        "QB": "Check that the formation is correct. Hands out ready to receive. Catch snap, fake handoff to Y. Look for open recievers and throw. ",
        "X": "Run fast and find open space in the area of your route. "
      }
    },
    {
      "id": "e04ac548-124d-4095-beb3-99625a1e4da7",
      "name": "Spread X Run — drill",
      "playId": "3164952d-69f6-45ec-b1b4-cca5f36a166f",
      "positions": [
        "QB",
        "X",
        "Y"
      ],
      "description": "Speed kills. Get the ball into the hands of the X immediately after the snap. Bang-bang. ",
      "notes": {
        "QB": "Check that the formation is correct. Hands out ready to receive. Catch snap, immediately handoff to X coming from the L. ",
        "X": "Face straight ahead, one foot forward at the line. At the snap, break hard R and take the handoff in front of the QB. Run hard and fast into daylight. ",
        "Y": "Face straight ahead, one foot forward at the line. Run your route as shown to clear space for the ball carrier. "
      }
    },
    {
      "id": "62f7997f-4067-4dac-aaa5-7b0385cb2807",
      "name": "Spread X Pass — drill",
      "playId": "4fede1f8-d11c-4cec-bf63-dd041e945bfb",
      "positions": [
        "QB",
        "X",
        "Y"
      ],
      "description": "Fake handoff to X, throw to open receiver. ",
      "notes": {
        "QB": "Make sure formation is correct. Hands out ready to receive. Take snap, fake handoff to X. Step back, look for open receivers and throw. ",
        "X": "Face straight ahead, one foot forward at the line. At the snap, break hard R in front of QB, accept the fake, and find open space on the R side, ready to receive. ",
        "Y": "Face straight ahead, one foot forward at the line. At the snap, run the route as shown, find open space, ready to receive. "
      }
    },
    {
      "id": "65f86598-f286-4f6c-8d85-dd37114efe85",
      "name": "Spread X Pass — drill",
      "playId": "4fede1f8-d11c-4cec-bf63-dd041e945bfb",
      "positions": [
        "C",
        "QB",
        "Z"
      ],
      "description": "",
      "notes": {
        "C": "Snap the ball to the QB, then break into open space, ready to receive. ",
        "QB": "Make sure formation is correct. Hands ready to receive. Take the snap, fake to X coming from L. Find an open receiver and throw. ",
        "Z": "Face straight ahead, one foot forward at the line. Run the route as shown, ready to receive. "
      }
    },
    {
      "id": "90e7daf7-8fb9-4180-a357-8e6c75852cd6",
      "name": "Spread Y Run — drill",
      "playId": "0cdb7b33-3d6f-4744-a2d8-87bc40f55954",
      "positions": [
        "QB",
        "X",
        "Y"
      ],
      "description": "Speed kills. Get the ball into the hands of the Y immediately after the snap. Bang-bang.",
      "notes": {
        "QB": "Check that the formation is correct. Hands out ready to receive. Catch snap, immediately handoff to Y coming from the R.",
        "X": "Face straight ahead, one foot forward at the line. Run your route as shown to clear space for the ball carrier.",
        "Y": "Face straight ahead, one foot forward at the line. At the snap, break hard L and take the handoff in front of the QB. Run hard and fast into daylight."
      }
    },
    {
      "id": "c6da6089-3a24-4733-a3e2-c24102cc3c33",
      "name": "Spread Y Pass — drill",
      "playId": "9ed8fd04-2def-415b-a720-4a2c22799395",
      "positions": [
        "QB",
        "X",
        "Y"
      ],
      "description": "Fake handoff to Y, throw to open receiver. ",
      "notes": {
        "QB": "Make sure formation is correct. Hands out ready to receive. Take snap, fake handoff to Y. Step back, look for open receivers and throw.",
        "X": "Face straight ahead, one foot forward at the line. At the snap, run the route as shown, find open space, ready to receive.",
        "Y": "Face straight ahead, one foot forward at the line. At the snap, break hard L in front of QB, accept the fake, and find open space over the middle, ready to receive."
      }
    },
    {
      "id": "f004b4a6-6984-4194-a281-0907bbe6d306",
      "name": "Spread Y Pass — drill",
      "playId": "9ed8fd04-2def-415b-a720-4a2c22799395",
      "positions": [
        "C",
        "QB",
        "Z"
      ],
      "description": "",
      "notes": {
        "C": "Snap the ball to the QB, then break into open space on the deep R, ready to receive.",
        "QB": "Make sure formation is correct. Hands ready to receive. Take the snap, fake to Y coming from R. Find an open receiver and throw.",
        "Z": "Face straight ahead, one foot forward at the line. Run the route as shown, ready to receive."
      }
    },
    {
      "id": "3be2410d-f800-4e66-b05a-c2b3d83bc8c2",
      "name": "Spread Free — drill",
      "playId": "d244855a-6713-43a3-8c11-ebb61ce20014",
      "positions": [
        "C",
        "QB",
        "X"
      ],
      "description": "This play tries to pull a defender out of position, leaving a receiver open. No fakes. QB gets the ball and looks for an open receiver. ",
      "notes": {
        "C": "Snap the ball to the QB, then break into open space on the L, ready to receive. ",
        "QB": "Make sure formation is correct. Hands ready to receive. Take the snap, drop back, find an open receiver, throw. ",
        "X": "Face straight ahead, one foot forward at the line. Run the route as shown towards the L deep side, ready to receive."
      }
    },
    {
      "id": "f01771a1-88d8-4a19-8972-203ca660544b",
      "name": "Spread Free — drill",
      "playId": "d244855a-6713-43a3-8c11-ebb61ce20014",
      "positions": [
        "QB",
        "Y",
        "Z"
      ],
      "description": "This play tries to pull a defender out of position, leaving a receiver open. No fakes. QB gets the ball and looks for an open receiver.",
      "notes": {
        "QB": "Make sure formation is correct. Hands ready to receive. Take the snap, drop back, find an open receiver, throw.",
        "Y": "Face straight ahead, one foot forward at the line. Run the route as shown towards the middle, and break to the R into open space. ",
        "Z": "Face straight ahead, one foot forward at the line. Run the route as shown from deep R to deep middle. "
      }
    }
  ]
};
