#!/usr/bin/env bash
# Complete static release; account service and sessions remain running.
set -euo pipefail
release="${1:?Supply release identifier}"
[[ "$release" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || exit 2
stage="/home/admin/play-island-upload/$release"
app=/var/www/play-island
target="$app/releases/$release"
previous=$(readlink "$app/current")
[[ "$previous" == "$app/releases/"* ]] || exit 2
test ! -e "$target"
test -f "$stage/site.tar.gz"
mkdir -p "/home/admin/play-island-backups/$release"
printf '%s\n' "$previous" > "/home/admin/play-island-backups/$release/previous-release"
sudo -n mkdir "$target"
sudo -n tar -xzf "$stage/site.tar.gz" -C "$target"
(cd "$target" && sha256sum -c SHA256SUMS)
sudo -n chown -R root:root "$target"
sudo -n find "$target" -type d -exec chmod 755 {} +
sudo -n find "$target" -type f -exec chmod 644 {} +
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
curl --fail --silent --show-error --max-time 20 https://47.107.99.105/games/sea-art.js -o "$stage/served-sea-art.js"
cmp "$target/sea-art.js" "$stage/served-sea-art.js"
curl --fail --silent --show-error --max-time 20 https://47.107.99.105/games/api/health
systemctl is-active nginx shareyourmind play-island-api
trap - ERR
printf '\nFrontend published: %s\n' "$release"
