# docker buildx create --name amd64-arm64 --driver docker-container
# docker buildx build -t drwarpman/steam-hour-booster-node --builder=amd64-arm64 --platform linux/amd64,linux/arm64 --no-cache . --push

FROM node:18-alpine

WORKDIR /usr/src/

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

CMD [ "node", "./src/index.js" ]