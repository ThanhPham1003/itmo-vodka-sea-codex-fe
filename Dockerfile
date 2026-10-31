# syntax=docker/dockerfile:1

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /src
COPY index.html ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY scripts/build.mjs ./scripts/build.mjs
RUN node scripts/build.mjs

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
RUN groupadd --gid 10001 app && \
    useradd --uid 10001 --gid 10001 --no-create-home --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=80 \
    STATIC_ROOT=/app/public \
    BACKEND_ORIGIN=http://backend:8080
COPY --from=build --chown=10001:10001 /src/dist/ ./public/
COPY --chown=10001:10001 scripts/server.mjs ./scripts/server.mjs
USER 10001:10001
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node", "scripts/server.mjs"]
