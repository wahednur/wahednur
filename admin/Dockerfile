# syntax=docker/dockerfile:1
ARG BUN_IMAGE=oven/bun:1
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1-alpine

# 1. Install with bun (the lockfile is bun.lock) and build the static files.
FROM ${BUN_IMAGE} AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# VITE_* values are baked into the JavaScript at build time: change them and rebuild.
ARG VITE_API_URL
ARG VITE_SITE_URL
ENV VITE_API_URL=${VITE_API_URL} VITE_SITE_URL=${VITE_SITE_URL}
RUN bun run build

# 2. Serve the files with nginx as a non-root user. No secrets live in this image.
FROM ${NGINX_IMAGE} AS runtime
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
