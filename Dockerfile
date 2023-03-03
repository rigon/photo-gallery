# Server
# FROM --platform=$BUILDPLATFORM 
FROM --platform=$TARGETPLATFORM golang:1.16-alpine3.15 AS server
RUN apk update && apk add musl-dev gcc g++ ffmpeg-libs ffmpeg-dev
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download -x
COPY server/ ./
ARG TARGETOS TARGETARCH
RUN GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=1 go build -v -installsuffix cgo -o photo-gallery
# For static compilation (not working): -ldflags '-extldflags "-static"'

# Fronted
FROM --platform=$BUILDPLATFORM node:alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Deploy
FROM --platform=$TARGETPLATFORM alpine:3.15
WORKDIR /app/server
EXPOSE 3080
VOLUME "/photos" "/thumbs"
RUN apk update && apk add ffmpeg-libs
COPY --from=frontend /app/build /app/build/
COPY --from=server /app/photo-gallery /app/server/photo-gallery
ENTRYPOINT ["./photo-gallery"]
CMD ["-c", "name=Photos,path=/photos,thumbs=/thumbs"]
