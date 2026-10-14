#!/usr/bin/env bash
# Frontend-only patch: retain the running account service and its sessions.
set -euo pipefail
release="${1:?Supply release identifier}"
[[ "$release" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || exit 2
stage="/home/admin/play-island-upload/$release"
app=/var/www/play-island
target="$app/releases/$release"
previous=$(readlink "$app/current")
[[ "$previous" == "$app/releases/"* ]] || exit 2
test ! -e "$target"
test -f "$stage/sea.js"
test -f "$stage/SHA256SUMS"
mkdir -p "/home/admin/play-island-backups/$release"
printf '%s\n' "$previous" > "/home/admin/play-island-backups/$release/previous-release"
sudo -n cp -a "$previous" "$target"
sudo -n install -m 644 "$stage/sea.js" "$target/sea.js"
sudo -n install -m 644 "$stage/SHA256SUMS" "$target/SHA256SUMS"
(cd "$target" && sha256sum -c SHA256SUMS)
rollback() {
  status=$?
  trap - ERR
  sudo -n ln -s "$previous" "$app/rollback-$release"
  sudo -n mv -Tf "$app/rollback-$release" "$app/current"
  echo 'Frontend rolled back.' >&2
  exit "$status"
}
trap rollback ERR
sudo -n ln -s "$target" "$app/current-$release"
sudo -n mv -Tf "$app/current-$release" "$app/current"
curl --fail --silent --show-error --max-time 20 https://47.107.99.105/games/sea.js -o "$stage/served-sea.js"
cmp "$stage/sea.js" "$stage/served-sea.js"
curl --fail --silent --show-error --max-time 20 https://47.107.99.105/games/api/health
systemctl is-active nginx shareyourmind play-island-api
trap - ERR
printf '\nFrontend published: %s\n' "$release"
