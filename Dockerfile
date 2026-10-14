# Etapa de compilación
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build -- --configuration production


# Etapa servidor web
FROM nginx:alpine

COPY --from=build /app/dist/frontend-campuslab/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]