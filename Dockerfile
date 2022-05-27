# Server
FROM golang:1.14 AS server
WORKDIR /app
COPY server/ .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o photo-gallery

# Fronted
FROM node:alpine AS frontend
WORKDIR /app
COPY package.json .
RUN npm install
COPY public/ public/
COPY src/ src/
RUN npm run build

# Deploy
FROM alpine
WORKDIR /app/server
EXPOSE 3080
VOLUME "/photos" "/thumbs"
COPY --from=frontend /app/build /app/build/
COPY --from=server /app/photo-gallery /app/server/photo-gallery
ENTRYPOINT ["./photo-gallery", "/photos", "/thumbs"]
