FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm install -g tsx nodemon

EXPOSE 3001

CMD ["npm", "run", "dev"]
