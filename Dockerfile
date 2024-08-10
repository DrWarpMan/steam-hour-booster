# docker buildx create --name amd64-arm64 --driver docker-container
# docker buildx build -t drwarpman/steam-hour-booster --builder=amd64-arm64 --platform linux/amd64,linux/arm64 --no-cache --push .

FROM oven/bun:1.1.22 AS base

WORKDIR /app

FROM base AS install

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY src/ src
COPY package.json .

ENTRYPOINT [ "bun", "." ]
