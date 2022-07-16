# Server
FROM golang:1.16-alpine3.15 AS server
RUN apk update && apk add musl-dev gcc g++ ffmpeg-libs ffmpeg-dev
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download -x
COPY server/ ./
RUN CGO_ENABLED=1 GOOS=linux go build -v -installsuffix cgo -o photo-gallery
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
FROM alpine:3.15
WORKDIR /app/server
EXPOSE 3080
VOLUME "/photos" "/thumbs"
RUN apk update && apk add ffmpeg-libs
COPY --from=frontend /app/build /app/build/
COPY --from=server /app/photo-gallery /app/server/photo-gallery
ENTRYPOINT ["./photo-gallery", "/photos", "/thumbs"]
