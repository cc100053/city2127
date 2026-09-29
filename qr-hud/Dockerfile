FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=4173 HOST=0.0.0.0 DATA_DIR=/app/.data
COPY package*.json ./
RUN npm ci --omit=dev && mkdir /app/.data && chown node:node /app/.data
COPY --from=build /app/dist ./dist
COPY server ./server
USER node
EXPOSE 4173
VOLUME /app/.data
CMD ["node", "server/index.js"]
