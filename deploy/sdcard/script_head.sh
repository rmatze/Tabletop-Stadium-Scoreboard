#!/bin/bash
# =============================================================================
# Tabletop Stadium Scoreboard - automatic setup (DietPi first boot, Orange Pi Zero 2W)
# Put this file on the SD card next to dietpi.txt. DietPi runs it once, at the
# end of its first boot. A log is written to /var/tmp/dietpi/logs/scoreboard-setup.log
# =============================================================================

# OPTIONAL: a Tailscale auth key lets you reach the scoreboard from anywhere,
# even if your home Wi-Fi won't let your PC or phone connect to it directly.
# Make one at https://login.tailscale.com/admin/settings/keys and paste it
# between the quotes. Leave it empty to skip Tailscale.
TAILSCALE_AUTHKEY=""

# -----------------------------------------------------------------------------
USER_NAME=dietpi
HOME_DIR=/home/$USER_NAME
APP=$HOME_DIR/nfl-scoreboard
mkdir -p /var/tmp/dietpi/logs   # /var/log is wiped at every reboot on DietPi
exec > >(tee -a /var/tmp/dietpi/logs/scoreboard-setup.log) 2>&1
echo "=== scoreboard setup started $(date) ==="

# 1) Wi-Fi: keep it awake so other devices can always reach the board
cat > /etc/udev/rules.d/70-wifi-powersave.rules <<'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlan*", RUN+="/usr/sbin/iw dev %k set power_save off"
EOF
cat > /etc/systemd/system/wifi-powersave-off.service <<'EOF'
[Unit]
Description=Turn off Wi-Fi power saving
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'for i in 1 2 3 4 5 6; do /usr/sbin/iw dev wlan0 set power_save off && exit 0; sleep 5; done'

[Install]
WantedBy=multi-user.target
EOF

# 2) packages
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y python3-venv curl iw cage chromium seatd python3-evdev avahi-daemon
iw dev wlan0 set power_save off || true
systemctl enable wifi-powersave-off.service seatd
systemctl start seatd || true

# 3) the scoreboard software (packed below this script)
mkdir -p "$HOME_DIR"
sed -n '/^__PAYLOAD_BELOW__$/,$p' "$0" | tail -n +2 | base64 -d | tar xz -C "$HOME_DIR"
chown -R $USER_NAME:$USER_NAME "$APP"
sudo -u $USER_NAME python3 -m venv "$APP/.venv"
sudo -u $USER_NAME "$APP/.venv/bin/pip" install -r "$APP/requirements.txt"
chmod +x "$APP/deploy/kiosk.sh"
usermod -aG video,input,render $USER_NAME

# touch screen fix (multi-touch panels without the hid-multitouch driver: taps land in the corner otherwise)
install -m 755 "$APP/deploy/touchfix.py" /usr/local/bin/touchfix.py
cp "$APP/deploy/touchfix.service" /etc/systemd/system/touchfix.service
systemctl daemon-reload
systemctl enable touchfix

# Wi-Fi setup from the screen / phone: a small helper the scoreboard may run as root (one sudo rule, nothing else)
install -m 755 "$APP/deploy/scoreboard-wifi.py" /usr/local/bin/scoreboard-wifi
install -m 440 "$APP/deploy/scoreboard-wifi.sudoers" /etc/sudoers.d/scoreboard-wifi
visudo -cf /etc/sudoers.d/scoreboard-wifi || rm -f /etc/sudoers.d/scoreboard-wifi

# phone app: announce the board on the network (mDNS / Bonjour) so the app finds it without an IP address
install -m 644 "$APP/deploy/scoreboard.avahi.service" /etc/avahi/services/scoreboard.service
systemctl enable avahi-daemon || true

# 4) start the server at boot
sed "s/YOURUSER/$USER_NAME/g" "$APP/deploy/scoreboard.service" > /etc/systemd/system/scoreboard.service
systemctl daemon-reload
systemctl enable scoreboard

# 5) full-screen board on the screen after auto-login (DietPi sets up the auto-login)
PROFILE=$HOME_DIR/.bash_profile
grep -q kiosk.sh "$PROFILE" 2>/dev/null || \
  echo '[ "$(tty)" = /dev/tty1 ] && exec ~/nfl-scoreboard/deploy/kiosk.sh' >> "$PROFILE"
chown $USER_NAME:$USER_NAME "$PROFILE"

# 6) optional remote access
if [ -n "$TAILSCALE_AUTHKEY" ]; then
  curl -fsSL https://tailscale.com/install.sh | sh
  tailscale up --authkey="$TAILSCALE_AUTHKEY" --hostname=scoreboard --ssh || true
fi

systemctl start scoreboard || true
echo "=== scoreboard setup finished $(date) ==="
# DietPi reboots after first-run setup; the board starts on the next boot.
exit 0
__PAYLOAD_BELOW__
