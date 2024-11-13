package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

const HeaderCacheControl = "private, max-age=31536000"

var config CmdArgs

func GetCollection(collection string) (*Collection, error) {
	val, present := config.collections[collection]
	if !present {
		return nil, errors.New("invalid collection: " + collection)
	}
	return val, nil
}

func collections(c echo.Context) error {
	return c.JSON(http.StatusOK, GetCollections(config.collections))
}

func pseudos(c echo.Context) error {
	return c.JSON(http.StatusOK, GetPseudoAlbums(config.collections))
}

func albums(c echo.Context) error {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Get all albums from the disk
	albums, err := collection.GetAlbums()
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, albums)
}

func album(c echo.Context) error {
	collectionName := c.Param("collection")
	albumName := c.Param("album")

	collection, err := GetCollection(collectionName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Fetch album from disk
	album, err := collection.GetAlbumWithPhotos(albumName, true, false)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, album)
}

func addAlbum(c echo.Context) error {
	var albumQuery AddAlbumQuery

	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	// Decode body
	if err := c.Bind(&albumQuery); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	// Add album
	err = collection.AddAlbum(albumQuery)
	if err != nil {
		return echo.NewHTTPError(http.StatusConflict, err.Error())
	}
	return c.JSON(http.StatusCreated, map[string]bool{"ok": true})
}

func thumb(c echo.Context) error {
	collectionName := c.Param("collection")
	albumName := c.Param("album")
	photoName := c.Param("photo")

	collection, err := GetCollection(collectionName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	c.Response().Header().Set(echo.HeaderContentType, "image/jpeg")
	c.Response().Header().Set(echo.HeaderCacheControl, HeaderCacheControl)
	AddThumbForeground(collection, album, photo, c.Response())
	return nil
}

func info(c echo.Context) error {
	collectionName := c.Param("collection")
	albumName := c.Param("album")
	photoName := c.Param("photo")

	collection, err := GetCollection(collectionName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	info, err := photo.GetExtendedInfo()
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, info)
}

func file(c echo.Context) error {
	collectionName := c.Param("collection")
	albumName := c.Param("album")
	photoName := c.Param("photo")
	fileName := c.Param("file")

	collection, err := GetCollection(collectionName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Fetch photo from cache
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Get file
	file, err := photo.GetFile(fileName)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	// Convert files that require conversion
	if file.RequiresConvertion() {
		return file.Convert(c.Response())
	}

	c.Response().Header().Set(echo.HeaderContentType, file.MIME)
	c.Response().Header().Set(echo.HeaderContentDisposition, "inline; filename=\""+file.Name()+"\"")
	c.Response().Header().Set(echo.HeaderCacheControl, HeaderCacheControl)
	return c.File(file.Path)
}

func saveToPseudo(c echo.Context) error {
	var query PseudoAlbumSaveQuery

	// Decode body
	if err := c.Bind(&query); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	album, err := collection.GetAlbum(c.Param("album"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	if !album.IsPseudo {
		return echo.NewHTTPError(http.StatusBadRequest, "album must be of type pseudo")
	}

	switch c.Request().Method {
	case "PUT":
		// Add photo to pseudo album
		err = album.EditPseudoAlbum(collection, query, true)
	case "DELETE":
		// Remove photo from pseudo album
		err = album.EditPseudoAlbum(collection, query, false)
	}
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]bool{"ok": true})
}

func main() {
	config = ParseCmdArgs()
	serverAddr := config.host + ":" + strconv.Itoa(config.port)
	log.Println("Collections:", config.collections)

	InitWorkers(config)
	for _, collection := range config.collections {
		collection.cache.Init(collection, config.recreateCacheDB)
		defer collection.cache.End()
	}

	// Cache albums and thumbnails in background
	if !config.disableScan {
		go func() {
			log.Println("Start scanning for photos in background...")
			// First cache all albums
			for _, collection := range config.collections {
				collection.Scan(config.fullScan)
			}
			// Clean thumbnails of deleted photos
			if config.fullScan {
				log.Println("Cleaning thumbnails...")
				CleanupThumbnails(config.collections)
			}
			// Then create thumbnails
			if config.cacheThumbnails {
				for _, collection := range config.collections {
					collection.CreateThumbnails()
				}
			}

			log.Println("Background scan complete!")
		}()
	}

	// Server
	e := echo.New()

	// Middleware
	e.Use(middleware.Secure())
	//e.Use(middleware.Recover())
	e.Use(middleware.GzipWithConfig(middleware.GzipConfig{
		Skipper: func(c echo.Context) bool {
			skip := []string{
				"/api/collections/*/albums/*/photos/*/thumb",   // Skip compressing thumbnails
				"/api/collections/*/albums/*/photos/*/files/*", // Skip compressing files
			}
			for _, pattern := range skip {
				if matched, _ := path.Match(pattern, c.Path()); matched {
					return true
				}
			}
			return false
		},
	}))
	e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
		CustomTimeFormat: "2006/01/02 15:04:05",
		Format:           "${time_custom} ${status} ${method} ${latency_human} ${path} (${remote_ip})\n",
		Output:           e.Logger.Output(),
	}))
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			defer ResumeBackgroundWork()
			SuspendBackgroundWork()
			return next(c)
		}
	})
	// URL decode parameters
	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			vs := c.ParamValues()
			ws := make([]string, len(vs))
			for i, v := range vs {
				w, err := url.PathUnescape(v)
				if err != nil {
					e.Logger.Error(err)
				} else {
					ws[i] = w
				}
			}
			c.SetParamValues(ws...)
			return next(c)
		}
	})

	// API
	api := e.Group("/api")
	api.GET("/pseudos", pseudos)
	api.GET("/collections", collections)
	api.GET("/collections/:collection/albums", albums)
	api.PUT("/collections/:collection/albums", addAlbum)
	api.GET("/collections/:collection/albums/:album", album)
	api.GET("/collections/:collection/albums/:album/photos/:photo/thumb", thumb)
	api.GET("/collections/:collection/albums/:album/photos/:photo/info", info)
	api.GET("/collections/:collection/albums/:album/photos/:photo/files/:file", file)
	api.PUT("/collections/:collection/albums/:album/pseudos", saveToPseudo)
	api.DELETE("/collections/:collection/albums/:album/pseudos", saveToPseudo)
	api.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]bool{"ok": true})
	})
	// Create a catch-all route for /api/*
	api.Any("/*", func(c echo.Context) error {
		return c.String(http.StatusNotFound, "not found")
	})

	// WebDAV
	if !config.webdavDisabled {
		e.Use(WebDAVWithConfig("/webdav", config.collections))
		log.Println("WebDAV will be available at http://" + serverAddr + "/webdav")
	}

	// Frontend
	// serve Single Page application on "/"
	// assume static file at ../build folder
	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Root:  "../build",   // This is the path to your SPA build folder, the folder that is created from running "npm build"
		Index: "index.html", // This is the default html page for your SPA
		HTML5: true,
		Skipper: func(c echo.Context) bool {
			isNotStatic := strings.HasPrefix(c.Path(), "/api") ||
				strings.HasPrefix(c.Path(), "/webdav")
			if !isNotStatic { // Cache-Control header
				c.Response().Header().Set(echo.HeaderCacheControl, HeaderCacheControl)
			}
			return isNotStatic
		},
	}))

	// Start server
	log.Println("Starting server: http://" + serverAddr)
	go func() {
		if err := e.Start(serverAddr); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server")
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with a timeout of 10 seconds.
	// Use a buffered channel to avoid missing signals as recommended for signal.Notify
	log.Println("Press Ctrl-C to stop the server")
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit
	log.Println("Shutting down the server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}
