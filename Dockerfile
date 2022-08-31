# docker buildx create --name amd64-arm64 --driver docker-container
# docker buildx build -t drwarpman/steam-hour-booster --builder=amd64-arm64 --platform linux/amd64,linux/arm64/v8,linux/arm/v7 --no-cache --push .

FROM node:18-alpine

ENV NODE_ENV production

WORKDIR /usr/src/booster

COPY package*.json ./

RUN npm ci

COPY . .

CMD [ "npm", "start" ]
