# Software setup

There are two ways to set it up:

- **[A. Self-installing SD card](#a-self-installing-sd-card-recommended)** (recommended). You edit three files on the
  card, plug the board in and wait about 20 minutes. You don't need a keyboard, mouse or SSH.
- **[B. Manual install](#b-manual-install)**, for an existing system or a different board.

**Tested:** DietPi on the Orange Pi Zero 2W. *Untested:* Raspberry Pi Zero 2 W (DietPi or Raspberry Pi OS Lite should
work the same way).

---

## A. Self-installing SD card (recommended)

You need: a microSD card (16–32 GB), a computer with a card reader, and your Wi-Fi name and password.

### 1. Write DietPi to the card

1. Download **DietPi** for **Orange Pi Zero 2W** from [dietpi.com](https://dietpi.com/#download).
2. Write it to the card with [balenaEtcher](https://etcher.balena.io/) or
   [Raspberry Pi Imager](https://www.raspberrypi.com/software/) (choose *Use custom* and pick the DietPi file).
3. Unplug the card and plug it back in. Your computer shows a small drive with `dietpi.txt` on it.

### 2. Add the setup script

Download **`Automation_Custom_Script.sh`** from the
[latest release](https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard/releases/latest) and copy it onto the card next to
`dietpi.txt`. It contains the scoreboard software and installs it on first boot.

> **Optional, remote access:** to reach the board from anywhere (or if your router won't let devices talk to each
> other), make a [Tailscale auth key](https://login.tailscale.com/admin/settings/keys), open the script in a text editor
> and paste it between the quotes on the `TAILSCALE_AUTHKEY=""` line. Change nothing else.

### 3. Wi-Fi: edit `dietpi-wifi.txt`

```
aWIFI_SSID[0]='YourWiFiName'
aWIFI_KEY[0]='YourWiFiPassword'
```

Use 2.4 GHz or 5 GHz; the Orange Pi Zero 2W supports both.

### 4. Settings: edit `dietpi.txt`

Find each line (Ctrl+F) and change it to the value below. Use your own password and
[time zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).

```
AUTO_SETUP_AUTOMATED=1
AUTO_SETUP_GLOBAL_PASSWORD=pick-a-password
AUTO_SETUP_NET_WIFI_ENABLED=1
AUTO_SETUP_NET_WIFI_COUNTRY_CODE=US
AUTO_SETUP_TIMEZONE=America/Los_Angeles
AUTO_SETUP_NET_HOSTNAME=scoreboard
AUTO_SETUP_SSH_SERVER_INDEX=-2
AUTO_SETUP_AUTOSTART_TARGET_INDEX=7
AUTO_SETUP_AUTOSTART_LOGIN_USER=dietpi
SURVEY_OPTED_IN=0
CONFIG_SERIAL_CONSOLE_ENABLE=0
```

| Line | What it does |
|---|---|
| `AUTO_SETUP_AUTOMATED=1` | sets itself up with no questions |
| `AUTO_SETUP_GLOBAL_PASSWORD` | the password for logging in over SSH later |
| `AUTO_SETUP_TIMEZONE` | so game times show in your time |
| `AUTO_SETUP_NET_HOSTNAME=scoreboard` | lets you reach it as `scoreboard` on your network |
| `AUTO_SETUP_SSH_SERVER_INDEX=-2` | turns on SSH (OpenSSH) |
| `AUTO_SETUP_AUTOSTART_TARGET_INDEX=7` + `LOGIN_USER=dietpi` | logs in automatically on the screen, which starts the scoreboard |

Save, eject the card, and put it in the Orange Pi.

### 5. First boot

Connect the screen, then power on. **Leave it alone for 15–20 minutes.** It updates, installs the scoreboard, and
restarts by itself.

If the screen still shows a text login prompt after 20 minutes, unplug it and plug it back in once.

### 6. Done

The scoreboard appears. **Press and hold the screen for 1 second** to open quick settings, which show the board's
address and a QR code for the full settings page on your phone. Then [set your teams](using.md).

> **Tip:** in your router's app, reserve the board's address (sometimes called *address reservation* or *static
> DHCP*), so it stays the same after a power cut.

### What the script installs

- Chromium in a full-screen kiosk (`cage`), started on auto-login
- The scoreboard server as a service (`scoreboard.service`)
- `touchfix`: a fix for touchscreens whose taps land in a corner on this kernel
- A small helper that lets the scoreboard change Wi-Fi from the screen (one sudo rule, nothing else)
- Wi-Fi power saving turned off, so other devices can always reach the board
- `avahi-daemon`, so the [phone app](../app/README.md) finds the board on your Wi-Fi
- Tailscale, only if you added a key

Log: `/var/tmp/dietpi/logs/scoreboard-setup.log` (DietPi wipes `/var/log` at every reboot).

---

## B. Manual install

For any Debian-based system (DietPi, Armbian, Raspberry Pi OS Lite) on the board, with SSH access.

```bash
sudo apt update
sudo apt install -y git python3-venv curl iw cage chromium seatd python3-evdev
# Raspberry Pi OS may call it chromium-browser

git clone https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard.git ~/nfl-scoreboard
cd ~/nfl-scoreboard
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
sudo usermod -aG video,input,render $USER
sudo systemctl enable --now seatd
```

> Clone into `~/nfl-scoreboard` exactly: the service and kiosk files expect that folder.

**Start the server at boot:**
```bash
sed "s/YOURUSER/$USER/g" deploy/scoreboard.service | sudo tee /etc/systemd/system/scoreboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now scoreboard
```

**Show the board full-screen after auto-login:**
1. Turn on console auto-login: `dietpi-autostart` (DietPi), `sudo raspi-config` → System → Boot/Auto Login →
   Console Autologin (Raspberry Pi OS), or `sudo armbian-config` (Armbian).
2. Launch the kiosk on login:
   ```bash
   chmod +x deploy/kiosk.sh
   echo '[ "$(tty)" = /dev/tty1 ] && exec ~/nfl-scoreboard/deploy/kiosk.sh' >> ~/.bash_profile
   ```

**Touch fix** (if taps land in the top-left or bottom-right corner):
```bash
sudo install -m 755 deploy/touchfix.py /usr/local/bin/touchfix.py
sudo cp deploy/touchfix.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now touchfix
```

**Wi-Fi from the screen:**
```bash
sudo install -m 755 deploy/scoreboard-wifi.py /usr/local/bin/scoreboard-wifi
sudo install -m 440 deploy/scoreboard-wifi.sudoers /etc/sudoers.d/scoreboard-wifi
sudo visudo -cf /etc/sudoers.d/scoreboard-wifi
```
This helper edits `/etc/wpa_supplicant/wpa_supplicant.conf` (as DietPi and Raspberry Pi OS Bullseye use). Systems that
manage Wi-Fi with NetworkManager aren't supported by the on-screen Wi-Fi setup yet.

Reboot: `sudo reboot`. On DietPi, if that prints a *login1.service* error and doesn't restart, use
`sudo systemctl reboot --force`.

**Low-memory boards** (512 MB, like the Pi Zero 2 W): raise swap to 512 MB. DietPi: `dietpi-drive_manager` → swap file.
Raspberry Pi OS: set `CONF_SWAPSIZE=512` in `/etc/dphys-swapfile`, then `sudo systemctl restart dphys-swapfile`.

---

## Updating

**From the board (manual install):**
```bash
cd ~/nfl-scoreboard && git pull && .venv/bin/pip install -r requirements.txt && sudo systemctl restart scoreboard
```

**SD card install:** the software lives in `~/nfl-scoreboard` without git. Either re-flash with the latest release, or
turn it into a git copy once:
```bash
cd ~ && mv nfl-scoreboard nfl-scoreboard.old
git clone https://github.com/Bombsurace/Tabletop-Stadium-Scoreboard.git nfl-scoreboard
cp -r nfl-scoreboard.old/.venv nfl-scoreboard.old/settings.json nfl-scoreboard/ 2>/dev/null
sudo systemctl restart scoreboard
```

Your settings live in `settings.json` and survive updates.
