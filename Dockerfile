syntax = docker/dockerfile:1.2
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN --mount=type=secret,id=service-account,dst=/run/secrets/service-account.json cat ./service-account.json
RUN --mount=type=secret,id=jwt_secret,dst=/run/secrets/jwt_secret.txt cat ./jwt_secret.txt 
RUN pnpm run build:common
RUN pnpm run build:services
RUN pnpm deploy --filter=@services/user-service --prod /prod/user-service
RUN pnpm deploy --filter=@services/question-service --prod /prod/question-service


FROM base AS question-service
COPY --from=build /prod/question-service /prod/question-service
WORKDIR /prod/question-service
EXPOSE 3001
CMD ["pnpm", "start"]

FROM base AS user-service
COPY --from=build /prod/user-service /prod/user-service
WORKDIR /prod/user-service
EXPOSE 3002
CMD ["pnpm", "start"]
