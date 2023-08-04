package main

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
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

func collections(c *gin.Context) {
	c.JSON(http.StatusOK, GetCollections(config.collections))
}

func pseudos(c *gin.Context) {
	c.JSON(http.StatusOK, GetPseudoAlbums(config.collections))
}

func albums(c *gin.Context) {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get all albums from the disk
	albums, err := collection.GetAlbums()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, albums)
}

func album(c *gin.Context) {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	albumName := c.Param("album")

	// Fetch album from disk
	album, err := collection.GetAlbumWithPhotos(albumName, true, false)
	if err != nil {
		c.AbortWithError(http.StatusNotFound, err)
		return
	}

	c.JSON(http.StatusOK, album)
}

func addAlbum(c *gin.Context) {
	var albumQuery AddAlbumQuery

	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Decode body
	if err := c.ShouldBindJSON(&albumQuery); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Add album
	err = collection.AddAlbum(albumQuery)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func thumb(c *gin.Context) {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	albumName := c.Param("album")
	photoName := c.Param("photo")

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusOK)
	c.Header("Content-Type", "image/jpeg")
	c.Header("Cache-Control", HeaderCacheControl)
	AddThumbForeground(collection, album, photo, c.Writer)
}

func info(c *gin.Context) {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	albumName := c.Param("album")
	photoName := c.Param("photo")

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	info, err := photo.GetExtendedInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, info)
}

func file(c *gin.Context) {
	collectionName := c.Param("collection")
	albumName := c.Param("album")
	photoName := c.Param("photo")
	fileName := c.Param("file")

	collection, err := GetCollection(collectionName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Fetch photo from cache
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Get file
	file, err := photo.GetFile(fileName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Convert files that require conversion
	if file.RequiresConvertion() {
		file.Convert(c.Writer)
		return
	}

	c.Header("Content-Type", file.MIME)
	c.Header("Content-Disposition", "inline; filename=\""+file.Name()+"\"")
	c.Header("Cache-Control", HeaderCacheControl)
	c.File(file.Path)
}

func saveToPseudo(c *gin.Context) {
	var query PseudoAlbumSaveQuery

	// Decode body
	if err := c.ShouldBindJSON(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	album, err := collection.GetAlbum(c.Param("album"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	if !album.IsPseudo {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch c.Request.Method {
	case "PUT":
		// Add photo to pseudo album
		err = album.EditPseudoAlbum(collection, query, true)
	case "DELETE":
		// Remove photo from pseudo album
		err = album.EditPseudoAlbum(collection, query, false)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
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
	r := gin.Default()

	// Middleware
	r.Use(func(c *gin.Context) {
		defer ResumeBackgroundWork()
		SuspendBackgroundWork()
		c.Next()
	})
	// Cache-Control header
	r.Use(func(c *gin.Context) {
		isNotStatic := strings.HasPrefix(c.Request.URL.Path, "/api") ||
			strings.HasPrefix(c.Request.URL.Path, "/webdav")
		if !isNotStatic { // Cache-Control header
			c.Header("Cache-Control", HeaderCacheControl)
		}
		c.Next()
	})

	// API
	api := r.Group("/api")
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
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})
	// Create a catch-all route for /api/*
	// api.Any("/*any", func(c *gin.Context) {
	// 	c.JSON(http.StatusNotFound, gin.H{"error": "invalid URL"})
	// })

	// WebDAV
	if !config.webdavDisabled {
		r.Use(ServeWebDAV("/webdav", config.collections))
		log.Println("WebDAV will be available at http://" + serverAddr + "/webdav")
	}

	// Frontend
	// serve Single Page application on "/"
	// assume static file at ../build folder
	r.Use(static.Serve("/", static.LocalFile("../build", false)))
	r.NoRoute(func(c *gin.Context) {
		c.File("../build/index.html")
	})

	// Start server
	log.Println("Starting server: http://" + serverAddr)
	log.Fatal(r.Run(serverAddr))
}
