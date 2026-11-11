# Using the board

## Controls

### On the touchscreen

| Do this | What happens |
|---|---|
| **Tap anywhere** | a bar appears with ◀ Prev, Auto (or ↩ Back when a game is locked), Next ▶ and ⚙ Settings. It hides after 6 seconds |
| **Tap a game** on a scores screen | opens that game's gamecast |
| **Press and hold about 1 second** | quick settings, plus the board's address and a QR code for the full settings page on your phone |

![Quick settings](images/photo-quick-settings.jpg)

Prev and Next **lock** the game on screen. It goes back to Auto 5 minutes after that game ends, or tap **Back**.

### From your phone or computer

<img src="images/mockup-phone.png" alt="Settings on a phone" width="220" align="right">

Scan the QR code in quick settings, or open `http://<board address>:8080/settings`
on any device on the same Wi-Fi.

There's also an early [phone app](../app/README.md) for iOS and Android that finds the board on its own.

### Keyboard (when testing on a computer)

| Key | Action |
|---|---|
| → / ← | next / previous game (locks it on screen) |
| A or Esc | back to Auto |
| T F D R I S X G | test animations: touchdown, field goal, first down, red zone, interception, safety, extra point, final |

## What it shows (Auto mode)

1. **A favorite team is live:** that game. If several favorites are live, it rotates between them, or shows only the
   top one.
2. **Other games are live but no favorite:** the live games grouped by division, mixed in with scores and standings,
   or left out (setting: *Other live games*).
3. **Nothing live:** your favorites' last or next games, then scores, then standings.

If a favorite scores while another game is on screen, its touchdown or field goal animation still plays.

## Settings

| Section | Settings |
|---|---|
| **Now showing** | what's on screen; lock any game, or go back to Auto |
| **Favorite teams** | your teams, in order of priority |
| **Live game view** | *Field* (ball, scrimmage and first-down lines, drive, red zone) or *Scoreboard* (big numbers); field angle (TV tilt or flat); field colors (home team, your favorite, or always your #1); score bar at the top or bottom |
| **Rotation** | which scores (favorites, your divisions, all, off), include last week, 1 or 4 games per screen; which standings (favorites' divisions, your divisions, AFC, NFC, league, off) and their layout (division, conference, ranked); how long each screen stays |
| **Hidden teams** | teams that never rotate on, unless they're playing one of your favorites |
| **Wi-Fi** | change networks (also on the board itself: ⚙ Settings → Wi-Fi) |
| **Behavior** | **TV sync delay**: ESPN's data often runs ahead of the broadcast, so set 30–60 seconds to avoid spoilers; how often to check for updates |
| **Display** | layout size (automatic from the screen's shape), rotation / upside down, use only part of the screen |
| **Animations** | turn each animation on or off |

Settings are saved on the board in `settings.json` and survive updates and restarts.

## Views

| | |
|---|---|
| ![Field, TV tilt](images/board-field.png) | ![Field, flat](images/board-field-flat.png) |
| Field, TV tilt | Field, flat |
| ![Scoreboard view](images/board-scoreboard.png) | ![Bar screen](images/board-bar-79in.png) |
| Scoreboard view | 7.9" bar screen layout (1280 × 400) |

Pregame, halftime and finals always use the scoreboard view.

## Changing Wi-Fi

- **On the screen:** tap, then ⚙ Settings → **Wi-Fi**. Pick your network, type the password on the on-screen keyboard,
  and tap Connect. If it can't connect within about 30 seconds, it switches back to the old network and tells you.
- **If the board goes offline:** after about a minute it shows a **No Wi-Fi** screen with a **Set up Wi-Fi** button.
- **From your phone:** the settings page has a Wi-Fi section, as long as the board is still on your network.
