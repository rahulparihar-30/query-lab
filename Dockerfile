FROM node:24-bookworm-slim
WORKDIR /app
COPY *.mjs index.html style.css app.js favicon.png ./
RUN mkdir /data && chown node:node /data
USER node
CMD ["node","server.mjs"]
