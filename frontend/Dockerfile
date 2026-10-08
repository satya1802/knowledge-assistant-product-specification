# Builds the SPA and serves the static bundle for the compose "frontend"
# service. VITE_API_BASE_URL is a build-time arg: Vite inlines
# `import.meta.env.VITE_API_BASE_URL` into the bundle at build time, so it
# must be supplied as a build arg (docker-compose.yml's `build.args`), not a
# runtime environment variable. Defaults to the same localhost backend
# src/lib/api.ts falls back to, so a plain `docker build` still works.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

# `-s` serves dist/index.html for unknown paths, so React Router's
# client-side routes (e.g. /chat, /sign-in) resolve on a hard refresh.
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
