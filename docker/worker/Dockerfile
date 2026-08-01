FROM oven/bun:1 AS typecheck

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY worker/package.json worker/bun.lock ./worker/
RUN cd worker && bun install --frozen-lockfile

COPY tsconfig.base.json ./
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src
COPY shared ./shared

RUN cd worker && bun run typecheck && touch /typecheck-passed

FROM oven/bun:1 AS production

WORKDIR /app/worker

COPY --from=typecheck /typecheck-passed /tmp/typecheck-passed

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY worker/package.json worker/bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --chown=bun:bun shared /app/shared
COPY --chown=bun:bun worker/src ./src

CMD ["bun", "run", "src/index.ts"]
