# Faza 1: build Vite aplikacije
FROM node:20-alpine AS build
WORKDIR /app

# Prvo samo package fajlovi, da se npm ci kešira dok se ne promijene zavisnosti
COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* varijable se ugrađuju u build u trenutku kompajliranja (ne u runtime),
# zato idu kao build argumenti, ne kao environment varijable kontejnera.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Faza 2: posluživanje gotovog builda preko nginx-a
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
