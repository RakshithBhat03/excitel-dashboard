FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY --chown=bun:bun src ./src

USER bun

CMD ["bun", "run", "src/index.js"]
