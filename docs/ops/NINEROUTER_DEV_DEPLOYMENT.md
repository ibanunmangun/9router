# Ninerouter Dev Deployment Runbook

This runbook updates the homelab dev container `ninerouter-dev` without touching its SQLite database volume or the production `ninerouter` container.

## Hard safety rules

- Never run `docker compose down -v` for dev or production.
- Never run `docker volume rm 9router-dev-data`.
- Never delete, replace, or reinitialize `/app/data`.
- Recreate the dev application container only; keep the same volume mounted at `/app/data`.
- Inspect the dev data mount before and after deploy.
- Do not run deploy commands against production `ninerouter` unless explicitly asked.

Think of the container as the engine and the Docker volume as the fuel tank: replacing the engine is fine; swapping the tank loses the data.

## Dev defaults

| Item | Value |
| --- | --- |
| Host | homelab (`ssh -F /home/itsnulla/Research/Server/home/conf/config homelab`) |
| Source checkout | `/home/itsnulla/9router-build` |
| Dev compose directory | `/home/itsnulla/9router-dev` |
| Dev env file | `/home/itsnulla/9router-dev/.env` |
| Container | `ninerouter-dev` |
| Image | `9router-dev:master` |
| Data volume | `9router-dev-data` |
| Data mount | `/app/data` |
| Local port | `20129 -> 20128` |
| Local health URL | `http://127.0.0.1:20129/api/health` |
| Public dev URL | `https://9router-dev.ibex-ilish.ts.net` |

## Production isolation

Production is separate and must remain untouched during dev deploys.

| Item | Production value |
| --- | --- |
| Container | `ninerouter` |
| Image | `9router:master` |
| Data volume | `9router_ninerouter_data` |
| Local port | `20128 -> 20128` |

## Known compose mismatch

`/home/itsnulla/9router-dev/compose.yml` may declare a compose-managed volume named `ninerouter_dev_data`, while the live dev container is expected to use the existing Docker volume `9router-dev-data`.

Do **not** run `docker compose up -d --force-recreate ninerouter-dev` blindly until the compose file is corrected and verified. It can attach the wrong dev volume and make the dashboard look like the DB disappeared.

## Safe deploy

On the homelab host:

```bash
DEPLOY_BRANCH=sync/upstream-v0.5.40  # replace with the branch you are testing
cd /home/itsnulla/9router-build
git fetch origin --prune
git switch "$DEPLOY_BRANCH" 2>/dev/null || git switch -c "$DEPLOY_BRANCH" "origin/$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"
docker build -t 9router-dev:master /home/itsnulla/9router-build
```

Then recreate only the dev container with the existing dev volume:

```bash
bash <<'DEPLOY_DEV'
set -euo pipefail

DEV_CONTAINER=ninerouter-dev
PROD_CONTAINER=ninerouter
DEV_VOLUME=9router-dev-data
PROD_VOLUME=9router_ninerouter_data
DEV_IMAGE=9router-dev:master
ENV_FILE=/home/itsnulla/9router-dev/.env
DATA_DEST=/app/data

mounted_volume() {
  docker inspect "$1" --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true
}

prod_before_status="$(docker inspect "$PROD_CONTAINER" --format '{{.State.Status}}' 2>/dev/null || true)"
prod_before_volume="$(mounted_volume "$PROD_CONTAINER")"
[ "$prod_before_status" = "running" ] || { echo "ERROR: production container not running before deploy" >&2; exit 1; }
[ "$prod_before_volume" = "$PROD_VOLUME" ] || { echo "ERROR: production volume mismatch before deploy" >&2; exit 1; }

dev_before_volume="$(mounted_volume "$DEV_CONTAINER")"
[ "$dev_before_volume" = "$DEV_VOLUME" ] || { echo "ERROR: dev volume mismatch before deploy: ${dev_before_volume:-none}" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "ERROR: missing dev env file" >&2; exit 1; }
docker volume inspect "$DEV_VOLUME" >/dev/null

docker rm -f "$DEV_CONTAINER" >/dev/null

docker run -d \
  --name "$DEV_CONTAINER" \
  --env-file "$ENV_FILE" \
  -e NODE_ENV=production \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e DATA_DIR=/app/data \
  -e NEXT_PUBLIC_BASE_URL=https://9router-dev.ibex-ilish.ts.net \
  -e BASE_URL=https://9router-dev.ibex-ilish.ts.net \
  -e AUTH_COOKIE_SECURE=true \
  -p 127.0.0.1:20129:20128 \
  -p 172.17.0.1:20129:20128 \
  -v "$DEV_VOLUME:$DATA_DEST" \
  --label com.centurylinklabs.watchtower.enable=false \
  --label org.opencontainers.image.title=9router \
  "$DEV_IMAGE" >/dev/null

sleep 3

dev_after_status="$(docker inspect "$DEV_CONTAINER" --format '{{.State.Status}}')"
dev_after_volume="$(mounted_volume "$DEV_CONTAINER")"
prod_after_status="$(docker inspect "$PROD_CONTAINER" --format '{{.State.Status}}')"
prod_after_volume="$(mounted_volume "$PROD_CONTAINER")"
[ "$dev_after_status" = "running" ] || { echo "ERROR: dev container status=$dev_after_status" >&2; exit 1; }
[ "$dev_after_volume" = "$DEV_VOLUME" ] || { echo "ERROR: dev volume changed: ${dev_after_volume:-none}" >&2; exit 1; }
[ "$prod_after_status" = "$prod_before_status" ] || { echo "ERROR: production status changed" >&2; exit 1; }
[ "$prod_after_volume" = "$prod_before_volume" ] || { echo "ERROR: production volume changed" >&2; exit 1; }

echo "OK: $DEV_CONTAINER running image=$DEV_IMAGE volume=$DEV_VOLUME:$DATA_DEST"
DEPLOY_DEV
```

The deploy flow:

1. Confirms production `ninerouter` is running with `9router_ninerouter_data` before doing anything.
2. Confirms dev `ninerouter-dev` currently mounts `9router-dev-data` at `/app/data`.
3. Builds `9router-dev:master` from `/home/itsnulla/9router-build`.
4. Recreates only `ninerouter-dev`.
5. Verifies `ninerouter-dev` still mounts `9router-dev-data` at `/app/data`.
6. Verifies production status and production volume did not change.

## Manual verification

```bash
docker ps --filter name=ninerouter-dev --format 'name={{.Names}} status={{.Status}} image={{.Image}} ports={{.Ports}}'
docker inspect ninerouter-dev --format 'mounts={{range .Mounts}}{{.Name}}:{{.Destination}} {{end}}'
docker volume inspect 9router-dev-data --format 'volume={{.Name}} mountpoint={{.Mountpoint}}'
curl -L -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:20129/api/health
```

Expected:

- `ninerouter-dev` is `Up`.
- `/app/data` is mounted from `9router-dev-data`.
- `/api/health` returns `200`.

Also verify production was not touched:

```bash
docker ps --filter name=ninerouter --format 'name={{.Names}} status={{.Status}} image={{.Image}} ports={{.Ports}}'
docker inspect ninerouter --format 'mounts={{range .Mounts}}{{.Name}}:{{.Destination}} {{end}}'
curl -L -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:20128/api/health
```

Expected:

- `ninerouter` is still `Up`.
- `/app/data` is still mounted from `9router_ninerouter_data`.
- `/api/health` returns `200`.

## Rollback

Rollback changes the dev application image only, not the dev DB volume.

```bash
cd /home/itsnulla/9router-build
git reset --hard <known-good-commit>
docker build -t 9router-dev:master /home/itsnulla/9router-build
```

Then rerun the safe dev recreate block above. Only use rollback after confirming `<known-good-commit>` is the intended app version.
