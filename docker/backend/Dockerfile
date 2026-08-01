FROM oven/bun:1 AS typecheck

WORKDIR /app

COPY backend/package.json backend/bun.lock ./backend/
RUN cd backend && bun install --frozen-lockfile

COPY tsconfig.base.json ./
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
COPY shared ./shared

RUN cd backend && bun run typecheck && touch /typecheck-passed

FROM oven/bun:1 AS production

WORKDIR /app/backend

COPY --from=typecheck /typecheck-passed /tmp/typecheck-passed

COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --chown=bun:bun shared /app/shared
COPY --chown=bun:bun backend/src ./src

USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
