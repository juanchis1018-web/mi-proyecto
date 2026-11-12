# Imagen de producción de CorteYa (backend + frontend estático)
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=America/Bogota
WORKDIR /app
RUN apk add --no-cache tzdata
COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared
# La aplicación no se ejecuta como root
RUN mkdir -p datos && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/v1/salud || exit 1
CMD ["node", "backend/src/server.js"]
