FROM harbor.ijx.icu/ijx-public/node:18-alpine as builder

WORKDIR /usr/src/app/

USER root

ARG PUBLIC_PATH=/web-umi-h5-template/
ENV PUBLIC_PATH=${PUBLIC_PATH}

RUN yarn config set registry https://registry.npmmirror.com

COPY package.json ./

COPY yarn.lock ./

RUN yarn

COPY ./ ./

RUN yarn run build:prod

RUN find . -name "*" -type f -print0 | xargs -0 gzip -9 -k

FROM harbor.ijx.icu/ijx-public/nginx:alpine

WORKDIR /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /usr/src/app/dist  /usr/share/nginx/html/