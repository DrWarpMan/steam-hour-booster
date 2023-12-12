FROM oven/bun:1.0.17 as base

WORKDIR /app

FROM base AS install

RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY src/ src
COPY index.ts .
COPY package.json .

ENTRYPOINT [ "bun", "run", "index.ts" ]
