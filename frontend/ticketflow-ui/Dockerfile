# ---------- Stage 1: Build Angular Application ----------
FROM node:24-alpine AS build
WORKDIR /workspace
ENV NG_PERSISTENT_BUILD_CACHE=0

COPY package.json package-lock.json ./
COPY . .

RUN if [ ! -f dist/ticketflow-ui/browser/index.html ]; then \
      npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
      && npm run build -- --configuration=production; \
    fi

# ---------- Stage 2: Non-Root Nginx Runtime ----------
FROM nginx:1.27-alpine AS runtime

# Configure Nginx to run as non-root user on port 8080
RUN sed -i 's,/var/run/nginx.pid,/tmp/nginx.pid,' /etc/nginx/nginx.conf \
    && sed -i '/user  nginx;/d' /etc/nginx/nginx.conf \
    && rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/ticketflow.conf
COPY --from=build /workspace/dist/ticketflow-ui/browser /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
