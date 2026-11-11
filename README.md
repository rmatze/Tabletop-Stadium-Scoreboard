<div align="center">

# Tabletop Stadium Scoreboard

**A live football gamecast in a 3D-printed field frame that sits on your desk or hangs on your wall.**

Live score, clock, down and distance, the ball on a mini field, touchdown animations, scores by division and standings.
It runs on a $20 single-board computer and a 7" touchscreen.

![Tabletop Stadium Scoreboard showing division scores](docs/images/photo-hero.jpg)

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Models: CC BY-NC-SA 4.0](https://img.shields.io/badge/models-CC%20BY--NC--SA%204.0-lightgrey.svg)](frame/LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-3776ab.svg)](requirements.txt)
[![Checks](https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard/actions/workflows/checks.yml/badge.svg)](https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard/actions/workflows/checks.yml)

[**Build guide**](#build-it) · [**Parts list**](docs/parts.md) · [**Troubleshooting**](docs/troubleshooting.md) · [**MakerWorld**](https://makerworld.com/en/models/3577626-tabletop-stadium-scoreboard-gamecast-desk-display) · [**FAQ**](docs/faq.md)

</div>

> **Currently: NFL.** More sports are planned (see the [roadmap](#roadmap)). Not affiliated with or endorsed by the NFL,
> its teams or ESPN; see [Notes](#notes).

---

## Features

<table>
<tr>
<td width="50%"><img src="docs/images/board-field.png" alt="Live game on the field view"></td>
<td width="50%"><img src="docs/images/fieldgoal.gif" alt="Field goal animation on the real board"></td>
</tr>
<tr>
<td><b>Live gamecast.</b> Ball position, line of scrimmage, first-down line, current drive, red zone, timeouts,
possession and the last play. TV-tilt or flat field, painted in the home team's colors.</td>
<td><b>Animations</b> (field goal shown). Touchdown, field goal, extra point, two-point try, safety, turnover, first down, red zone,
kickoff, halftime and final. Each one can be turned on or off.</td>
</tr>
<tr>
<td><img src="docs/images/board-scores-division.png" alt="Scores by division"></td>
<td><img src="docs/images/board-standings.png" alt="Division standings"></td>
</tr>
<tr>
<td><b>Scores by division.</b> Four games per screen, with byes, live games highlighted. Tap a game to open its
gamecast.</td>
<td><b>Standings.</b> By division, conference or ranked by playoff seed, rotating when nothing is live.</td>
</tr>
<tr>
<td><img src="docs/images/photo-quick-settings.jpg" alt="Quick settings on the touchscreen"></td>
<td align="center"><img src="docs/images/mockup-phone.png" alt="Settings page on a phone" width="45%"></td>
</tr>
<tr>
<td><b>Touch controls.</b> Tap for next, previous, back and settings. Press and hold for quick settings and a QR code
that opens the full settings page on your phone.</td>
<td><b>Phone settings.</b> Favorites, hidden teams, what rotates and how fast, a TV-delay so it doesn't spoil plays,
and Wi-Fi.</td>
</tr>
</table>

**Also:**
- **Favorites first.** When a favorite team plays, the board follows that game. If a favorite scores while another game
  is showing, the touchdown animation still plays.
- **Change Wi-Fi from the screen.** It has an on-screen keyboard, and if a new network fails it goes back to the old
  one. If the board drops offline it shows a *Set up Wi-Fi* button.
- **SD card that sets itself up.** Copy one script onto the card and the board installs everything on first boot. You
  don't need a keyboard or SSH.
- **Prints with no supports.** The kickstand prints in place and clicks shut. The end zones snap in, with two-color
  lettering. It hangs on the wall from two keyholes.
- **Customizable (beta).** OpenSCAD customizers make your own end zone text, a back for a different board, or move the power
  and switch holes.

---

## See it run

<table>
<tr>
<td width="50%"><img src="docs/images/firstdown.gif" alt="First down during a live game, flat field"></td>
<td width="50%"><img src="docs/images/tilted.gif" alt="Live games on the TV-tilt field"></td>
</tr>
<tr>
<td><b>Flat field</b> during a live game, with a first down.</td>
<td><b>TV-tilt field</b> with the score bar on top, rotating through live games.</td>
</tr>
</table>

## The frame

<table>
<tr>
<td width="33%"><img src="docs/images/photo-kickstand.jpg" alt="Kickstand, side view"></td>
<td width="33%"><img src="docs/images/photo-side-switch.jpg" alt="Power switch and USB-C on the side"></td>
<td width="33%"><img src="docs/images/photo-endzone.jpg" alt="Snapping in an end zone"></td>
</tr>
<tr>
<td><b>Desk.</b> A print-in-place kickstand leans it back about 22°, and clicks shut when folded.</td>
<td><b>Power</b> switch and USB-C socket snap into the side wall.</td>
<td><b>Swappable end zones.</b> They snap in, with flush two-color lettering. Make your own in the customizer (beta).</td>
</tr>
<tr>
<td colspan="2"><img src="docs/images/photo-open.jpg" alt="Opened up: back tray and front with the screen"></td>
<td><img src="docs/images/mockup-wall.png" alt="Hanging on a wall (render)"></td>
</tr>
<tr>
<td colspan="2"><b>Inside.</b> Every part has a labeled spot. The front lifts off with the screen attached.</td>
<td><b>Wall.</b> Two keyholes 200 mm apart (render).</td>
</tr>
</table>

---

## Build it

| Step | Time | Guide |
|---|---|---|
| 1. Get the parts | roughly $100–130 | [Parts list](docs/parts.md) |
| 2. Print the frame | a day of printing (front, back, end zones) | [Print files on MakerWorld](https://makerworld.com/en/models/3577626-tabletop-stadium-scoreboard-gamecast-desk-display) · [Printing guide](docs/printing.md) |
| 3. Set up the SD card | 10 min + a 20 min wait | [Software setup](docs/software-setup.md) |
| 4. Wire and assemble | 30 min | [Assembly guide](docs/assembly.md) |
| 5. Set your teams | 2 min | [Using the board](docs/using.md) |

> [!IMPORTANT]
> **Power it with a USB-A charger (the rectangular plug) and a USB-A to USB-C cable.** The tested build uses a simple
> 2-wire USB-C socket, and a USB-C to USB-C charger (like most phone and laptop bricks) will **not** turn it on.
> A breakout board that works with any USB-C charger is planned; see [no power](docs/troubleshooting.md#no-power).

**Tested build:** Orange Pi Zero 2W (1 GB) + Hosyond 7" 1024×600 HDMI touchscreen + DietPi, printed in PLA on a Bambu
Lab printer. Other parts that should work are marked *untested* in the guides.

<details>
<summary><b>What's inside</b> (the back tray, with a labeled spot for every part)</summary>

![Back tray](docs/images/back-tray.png)

</details>

---

## Try it on your computer first

No hardware needed. You need Python 3.9 or newer.

```bash
git clone https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard.git
cd Tabletop-Stadium-Scoreboard
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python server.py --demo            # a scripted game that shows every animation
python server.py                   # real, live data
```

Open **http://localhost:8080** for the board and **http://localhost:8080/settings** for settings. To see it at the real
size, set the browser's device toolbar to **1024 × 600**.

---

## Documentation

| | |
|---|---|
| [Parts list](docs/parts.md) | everything to buy, with links and what's been tested |
| [Printing guide](docs/printing.md) | which files, settings, orientation, two-color end zones, hinge test prints |
| [Software setup](docs/software-setup.md) | the self-installing SD card, or a manual install |
| [Assembly guide](docs/assembly.md) | wiring, mounting the board and screen, closing it up |
| [Using the board](docs/using.md) | touch controls, what it shows when, every setting |
| [Troubleshooting](docs/troubleshooting.md) | no power, touch in the wrong spot, Wi-Fi, blank screen, print problems |
| [FAQ](docs/faq.md) | other screens and boards, other sports, cost, privacy |
| [Customizing the models](frame/openscad/README.md) | OpenSCAD customizers (beta) and the CadQuery source |
| [Development](docs/development.md) | how the code is laid out, the API, building the STLs |

---

## Roadmap

- [x] NFL gamecast, scores, standings, animations
- [x] Field frame: desk kickstand and wall keyholes, snap-in end zones
- [x] Self-installing SD card, Wi-Fi setup from the screen
- [x] OpenSCAD customizers: end zones, back tray (beta, being print-tested)
- [ ] Phone app for iOS and Android (early, in [`app/`](app/README.md))
- [ ] OpenSCAD customizer for the front (other screen sizes)
- [ ] USB-C power board that works with any USB-C charger
- [ ] Split frame for 256 mm printers (A1, P1, P2S, X1)
- [ ] More sports: MLB, NHL, NBA, then college
- [ ] Optional LED end zones

Ideas and requests are welcome in [Issues](https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard/issues).

## Contributing

Bug reports, photos of your build, and pull requests are all welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

- **Code** (Python, JavaScript, scripts): [MIT](LICENSE)
- **3D models** (STL, STEP, 3MF, OpenSCAD and CadQuery sources in `frame/`):
  [CC BY-NC-SA 4.0](frame/LICENSE). Print them, remix them and share them with credit, but don't sell them or prints
  of them.

## Notes

- **Not affiliated** with the NFL, any team, or ESPN. Team names and logos belong to their owners.
- **Data** comes from ESPN's public but unofficial and undocumented scoreboard feed, which many hobby projects use. It
  can change without notice. If it breaks, `espn.py` is the only file to update.
- **Logos** are not included in this repository. The board downloads them from ESPN on first start and keeps them on
  the board. Screenshots in this README use placeholder logos.
- **Affiliate links:** some links in the parts list are Amazon affiliate links. As an Amazon Associate I earn from
  qualifying purchases, at no extra cost to you. The project is the same either way.
- Font: [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) (SIL Open Font License).
