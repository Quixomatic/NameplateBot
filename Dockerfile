FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod && apk del python3 make g++

COPY src/ ./src/

RUN mkdir -p /app/data && chown -R node:node /app

USER node

VOLUME ["/app/data"]

CMD ["node", "src/index.js"]
