#!/bin/sh
set -e

: "${API_URL:=/api}"
: "${KEYCLOAK_ISSUER:=ticketflow-auth}"

export API_URL KEYCLOAK_ISSUER

if [ -f /usr/share/nginx/html/env.template.js ]; then
  envsubst '${API_URL} ${KEYCLOAK_ISSUER}' \
    < /usr/share/nginx/html/env.template.js \
    > /usr/share/nginx/html/env.js
fi

exec nginx -g "daemon off;"
