# Scoreboard phone app (iOS and Android)

A native app for changing the board's settings, in place of the browser page at `http://<board>:8080/settings`.
It's built with [Expo](https://expo.dev) (React Native) and talks to the board's existing HTTP API, so the board
needs no new server code.

**Status: early.** It covers everything the web settings page does. It isn't in the App Store or Play Store yet.

## What it does

- **Find the board.** It lists the boards on your Wi-Fi (mDNS / Bonjour), or you can scan the QR code on the board
  (press and hold the screen) or type its address. It remembers the board for next time.
- **Board tab:** what's showing now, Prev / Auto / Next, and this week's games. Tap a game to lock it on screen.
- **Teams tab:** favorites in priority order, and hidden teams.
- **Settings tab:** live game view, rotation, your divisions, behavior, animations (with a Test button), display, and
  Wi-Fi.

## How it finds the board

The board announces itself as `_scoreboard._tcp` on port 8080
([`deploy/scoreboard.avahi.service`](../deploy/scoreboard.avahi.service)). SD cards built from this version on set
this up automatically. To add it to a board that's already running, SSH in and run:

```bash
sudo apt-get install -y avahi-daemon
sudo cp ~/nfl-scoreboard/deploy/scoreboard.avahi.service /etc/avahi/services/scoreboard.service
sudo systemctl enable --now avahi-daemon
```

Without it, the app still connects by QR code or a typed address.

## Run it

You need Node 20 or newer. The app uses native modules (mDNS and the camera), so it runs as a **development build**,
not in Expo Go.

```bash
cd app
npm install
npm run ios          # builds and opens the iOS Simulator (needs Xcode and CocoaPods)
npm run android      # builds and opens an Android emulator or a plugged-in phone (needs Android Studio)
```

After the first build, `npx expo start` is enough to reload code changes.

To test without a board, run the demo server from the repo root (`python server.py --demo`) and advertise it from a
Mac so the app can find it:

```bash
dns-sd -R "Scoreboard (demo)" _scoreboard._tcp local 8080 api=1 path=/settings
```

The iOS Simulator shares the Mac's network, so it finds the demo. The Android emulator sits behind its own NAT, so
type `10.0.2.2:8080` instead.

## Layout

| Path | What it does |
|---|---|
| `src/lib/api.ts` | the board's API: types, requests, address parsing |
| `src/lib/options.ts` | every setting's label, help text and allowed values (mirrors `static/settings.html` and `config.py`) |
| `src/lib/board.tsx` | the connected board, its settings and teams, saving |
| `src/components/ui.tsx` | grouped-list rows, switches, number fields, team chips |
| `src/app/` | the screens ([Expo Router](https://docs.expo.dev/router/introduction/): one file per screen) |

When you add a setting to `config.py`, add it to `src/lib/options.ts` too.

## Platform notes

- **Plain HTTP on the local network:** iOS allows it through `NSAllowsLocalNetworking`. Android has cleartext
  traffic turned on (`expo-build-properties`).
- **iOS Local Network permission:** iOS asks the first time the app searches. If it's turned off, the connect
  screen says so.
- **The API has no login**, the same as the web page. Anyone on your Wi-Fi can change settings, so don't expose port
  8080 to the internet. Use Tailscale for remote access.

## Publishing

Builds for the stores go through EAS (`npx eas-cli@latest build`). Before the first store build, change
`ios.bundleIdentifier` and `android.package` in `app.json` to an identifier you own.
