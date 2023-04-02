FROM node:18-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./

FROM base AS installer
RUN yarn install --production --frozen-lockfile

FROM installer AS builder
COPY . .
RUN yarn install --frozen-lockfile && \
    yarn build

FROM base AS runner
COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]