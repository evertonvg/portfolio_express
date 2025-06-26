FROM node:20

WORKDIR /app

# Copia apenas os arquivos de dependência para instalar primeiro
COPY package*.json ./
COPY tsconfig*.json ./
COPY nodemon.json ./

# Instala dependências incluindo as dev
RUN npm install

# Instala nodemon globalmente (opcional, mas ajuda no CMD)
RUN npm install -g nodemon ts-node typescript

# Copia o restante do projeto
COPY . .

EXPOSE 3333

CMD ["npm", "run", "dev"]
