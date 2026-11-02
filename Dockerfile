# One image: builds the web panel and serves it from the API.
#   docker build -t meyra .
#   docker run -p 4000:4000 --env-file apps/api/.env meyra
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspaces --include-workspace-root
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build -w apps/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root --omit=dev
COPY apps/api apps/api
COPY --from=build /app/apps/web/dist apps/web/dist
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
