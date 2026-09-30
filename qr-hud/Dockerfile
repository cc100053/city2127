FROM node:22-bookworm-slim AS build
WORKDIR /app/qr-hud
COPY qr-hud/package*.json ./
RUN npm ci
COPY qr-hud/index.html qr-hud/vite.config.js ./
COPY qr-hud/src ./src
COPY qr-hud/public ./public
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4173 HOST=0.0.0.0 DATA_DIR=/app/.data
COPY qr-hud/package*.json ./
RUN npm ci --omit=dev && mkdir /app/.data && chown node:node /app/.data
COPY --from=build /app/qr-hud/dist ./dist
COPY qr-hud/server ./server
USER node
EXPOSE 4173
VOLUME /app/.data
CMD ["node", "server/index.js"]
