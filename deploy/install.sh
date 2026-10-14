#!/usr/bin/env bash
set -euo pipefail
release="${1:?Supply release identifier}"
[[ "$release" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || exit 2
stage="/home/admin/play-island-upload/$release"
app=/var/www/play-island
target="$app/releases/$release"
config=/etc/nginx/sites-available/personal-site
snippet=/etc/nginx/snippets/play-island.conf
backup="/home/admin/play-island-backups/$release"
backend=/opt/play-island-api
backend_target="$backend/releases/$release"
unit=/etc/systemd/system/play-island-api.service
runtime=/opt/play-island-node/node-v24.21.0-linux-x64/bin/node
test -f "$stage/site.tar.gz"
test -f "$stage/backend.tar.gz"
test ! -e "$target"
test ! -e "$backend_target"
if ! test -x "$runtime"; then
  curl --fail --silent --show-error --max-time 180 https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz -o "$stage/node.tar.xz"
  echo "fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6  $stage/node.tar.xz" | sha256sum -c -
  sudo -n mkdir -p /opt/play-island-node
  sudo -n tar -xJf "$stage/node.tar.xz" -C /opt/play-island-node
fi
"$runtime" --version
mkdir -p "$backup"
sudo -n cp -p "$config" "$backup/personal-site"
if sudo -n test -f "$snippet"; then sudo -n cp -p "$snippet" "$backup/play-island.conf"; fi
previous=$(readlink "$app/current" || true)
previous_backend=$(readlink "$backend/current" || true)
if sudo -n test -f "$unit"; then sudo -n cp -p "$unit" "$backup/play-island-api.service"; fi
printf '%s\n' "$previous" > "$backup/previous-release"
printf '%s\n' "$previous_backend" > "$backup/previous-backend"
rollback() {
  status=$?
  trap - ERR
  set +e
  sudo -n cp -p "$backup/personal-site" "$config"
  if test -f "$backup/play-island.conf"; then sudo -n cp -p "$backup/play-island.conf" "$snippet"; else sudo -n rm -f "$snippet"; fi
  if test -n "$previous"; then
    sudo -n ln -s "$previous" "$app/rollback-$release"
    sudo -n mv -Tf "$app/rollback-$release" "$app/current"
  else sudo -n rm -f "$app/current"; fi
  if test -n "$previous_backend"; then
    sudo -n ln -s "$previous_backend" "$backend/rollback-$release"
    sudo -n mv -Tf "$backend/rollback-$release" "$backend/current"
  fi
  if test -f "$backup/play-island-api.service"; then
    sudo -n cp -p "$backup/play-island-api.service" "$unit"
    sudo -n systemctl daemon-reload
    sudo -n systemctl restart play-island-api
  else
    sudo -n systemctl disable --now play-island-api
    sudo -n rm -f "$unit"
    sudo -n systemctl daemon-reload
  fi
  sudo -n nginx -t && sudo -n systemctl reload nginx
  echo 'Deployment rolled back.' >&2
  exit "$status"
}
trap rollback ERR
sudo -n mkdir -p "$target"
sudo -n tar -xzf "$stage/site.tar.gz" -C "$target"
(cd "$target" && sha256sum -c SHA256SUMS)
sudo -n find "$target" -type d -exec chmod 755 {} +
sudo -n find "$target" -type f -exec chmod 644 {} +
sudo -n mkdir -p "$backend_target"
sudo -n tar -xzf "$stage/backend.tar.gz" -C "$backend_target"
(cd "$backend_target" && sha256sum -c SHA256SUMS)
sudo -n find "$backend_target" -type d -exec chmod 755 {} +
sudo -n find "$backend_target" -type f -exec chmod 644 {} +
sudo -n install -d -m 700 -o admin -g admin /var/lib/play-island
sudo -n ln -s "$backend_target" "$backend/current-$release"
sudo -n mv -Tf "$backend/current-$release" "$backend/current"
sudo -n install -m 644 "$stage/play-island-api.service" "$unit"
sudo -n systemctl daemon-reload
sudo -n systemctl enable play-island-api
sudo -n systemctl restart play-island-api
curl --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 1 http://127.0.0.1:8092/api/health
sudo -n install -m 644 "$stage/play-island.conf" "$snippet"
sudo -n python3 - "$config" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
include = '    include /etc/nginx/snippets/play-island.conf;'
if include not in s:
    anchor = '    listen 443 ssl default_server;'
    if s.count(anchor) != 1:
        raise SystemExit('HTTPS server anchor changed; refusing to guess')
    p.write_text(s.replace(anchor, anchor + '\n' + include, 1))
PY
sudo -n ln -s "$target" "$app/current-$release"
sudo -n mv -Tf "$app/current-$release" "$app/current"
sudo -n nginx -t
sudo -n systemctl reload nginx
curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 1 https://47.107.99.105/games/ -o /dev/null
curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 1 https://47.107.99.105/games/api/health
systemctl is-active nginx shareyourmind play-island-api
curl --fail --silent --show-error http://127.0.0.1:8080/actuator/health
trap - ERR
printf '\nPublished: https://47.107.99.105/games/\nRelease: %s\nBackup: %s\n' "$release" "$backup"
