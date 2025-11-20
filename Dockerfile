# syntax=docker/dockerfile:1.4
FROM node:22-slim AS build
WORKDIR /app

COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY . .
RUN yarn build
EXPOSE 3000

ENTRYPOINT ["yarn", "start"]

