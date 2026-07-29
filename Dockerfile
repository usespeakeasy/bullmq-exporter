ARG NODE_VERSION="24"
ARG ALPINE_VERSION="3.24"

FROM node:$NODE_VERSION AS builder

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install
COPY . .
RUN npm run build


FROM node:$NODE_VERSION-alpine$ALPINE_VERSION

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --omit=dev

COPY --from=builder /app/dist /app
COPY ./configs /app/configs

CMD [ "node", "server.js" ]
