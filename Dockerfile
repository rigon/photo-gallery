# Server
FROM golang:1.14-alpine3.13 AS server
RUN apk update && apk add musl-dev gcc g++ ffmpeg-libs ffmpeg-dev
WORKDIR /app
COPY server/ .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o photo-gallery
# For static compilation (not working): -ldflags '-extldflags "-static"'

# Fronted
FROM node:alpine AS frontend
WORKDIR /app
COPY package.json .
RUN npm install
COPY public/ public/
COPY src/ src/
RUN npm run build

# Deploy
FROM alpine:3.13
WORKDIR /app/server
EXPOSE 3080
VOLUME "/photos" "/thumbs"
RUN apk update && apk add ffmpeg-libs
COPY --from=frontend /app/build /app/build/
COPY --from=server /app/photo-gallery /app/server/photo-gallery
ENTRYPOINT ["./photo-gallery", "/photos", "/thumbs"]
