# React frontend: built once, then served as static files by nginx.
#
# react-scripts start is a development server - it watches files, ships
# source maps and is slow. Production serves the build output instead.

# ------------------------------------------------------------------
# Build
# ------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /build

# package files alone first, so node_modules is only reinstalled when
# the dependency list actually changes.
COPY package*.json ./
RUN npm ci

COPY public/ public/
COPY src/ src/

# Where the browser should send API calls. Create React App inlines
# REACT_APP_* at build time, so this has to be known here rather than
# set on the running container.
ARG REACT_APP_API_URL=http://localhost:8080
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# react-scripts treats lint warnings as build failures when CI is set,
# and CI is set by default in most build environments. Unused imports
# should not stop an image from building.
RUN CI=false npm run build

# ------------------------------------------------------------------
# Runtime
# ------------------------------------------------------------------
FROM nginx:alpine

# Replaces the default site, mainly for the SPA fallback - see the
# comments in nginx.conf.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/build /usr/share/nginx/html

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD wget -qO- http://localhost:3000/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
