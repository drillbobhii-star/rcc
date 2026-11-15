FROM node:26-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --chown=node:node . .
USER node
CMD ["npm", "start"]
