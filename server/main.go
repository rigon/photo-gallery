package main

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"golang.org/x/net/webdav"
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

func collections(c *fiber.Ctx) error {
	return c.JSON(GetCollections(config.collections))
}

func pseudos(c *fiber.Ctx) error {
	return c.JSON(GetPseudoAlbums(config.collections))
}

func albums(c *fiber.Ctx) error {
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}

	// Get all albums from the disk
	albums, err := collection.GetAlbums()
	if err != nil {
		return err
	}

	return c.JSON(albums)
}

func album(c *fiber.Ctx) error {
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	albumName := c.Params("album")

	// Fetch album from disk
	album, err := collection.GetAlbumWithPhotos(albumName, true, false)
	if err != nil {
		return err
	}

	return c.JSON(album)
}

func addAlbum(c *fiber.Ctx) error {
	var albumQuery AddAlbumQuery

	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	// Decode body
	if err := c.BodyParser(&albumQuery); err != nil {
		return err
	}

	// Add album
	return collection.AddAlbum(albumQuery)
}

func thumb(c *fiber.Ctx) error {
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	albumName := c.Params("album")
	photoName := c.Params("photo")

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return err
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return err
	}

	c.Set(fiber.HeaderContentType, "image/jpeg")
	c.Set(fiber.HeaderCacheControl, HeaderCacheControl)
	AddThumbForeground(collection, album, photo, c.Response().BodyWriter())
	return nil
}

func info(c *fiber.Ctx) error {
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	albumName := c.Params("album")
	photoName := c.Params("photo")

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return err
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return err
	}

	info, err := photo.GetExtendedInfo()
	if err != nil {
		return err
	}

	return c.JSON(info)
}

func file(c *fiber.Ctx) error {
	collectionName := c.Params("collection")
	albumName := c.Params("album")
	photoName := c.Params("photo")
	fileName := c.Params("file")

	collection, err := GetCollection(collectionName)
	if err != nil {
		return err
	}

	// Fetch photo from cache
	album, err := collection.GetAlbumWithPhotos(albumName, false, false)
	if err != nil {
		return err
	}

	// Find photo
	photo, err := album.GetPhoto(photoName)
	if err != nil {
		return err
	}

	// Get file
	file, err := photo.GetFile(fileName)
	if err != nil {
		return err
	}

	// Convert files that require conversion
	if file.RequiresConvertion() {
		c.Response().SetBodyStreamWriter(func(w *bufio.Writer) {
			file.Convert(w)
		})
		return nil
	}

	c.Set(fiber.HeaderContentType, file.MIME)
	c.Set(fiber.HeaderContentDisposition, "inline; filename=\""+file.Name()+"\"")
	c.Set(fiber.HeaderCacheControl, HeaderCacheControl)
	return c.SendFile(file.Path)
}

func saveToPseudo(c *fiber.Ctx) (err error) {
	var query PseudoAlbumSaveQuery

	// Decode body
	if err = c.BodyParser(&query); err != nil {
		return
	}

	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return
	}

	album, err := collection.GetAlbum(c.Params("album"))
	if err != nil {
		return err
	}

	if !album.IsPseudo {
		return errors.New("album must be of type pseudo")
	}

	switch c.Method() {
	case "PUT":
		// Add photo to pseudo album
		err = album.EditPseudoAlbum(collection, query, true)
	case "DELETE":
		// Remove photo from pseudo album
		err = album.EditPseudoAlbum(collection, query, false)
	}
	if err != nil {
		return
	}

	return c.JSON(map[string]bool{"ok": true})
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
	app := fiber.New(fiber.Config{
		RequestMethods:    mergeWithoutDuplicates(fiber.DefaultMethods, WebDAVMethods),
		UnescapePath:      true,
		StreamRequestBody: true, // For requests > BodyLimit(4MB), body is streamed
	})

	// Middleware
	app.Use(logger.New(logger.Config{
		Format: "[${latency}] ${status} - ${method} ${path}\n",
	}))

	app.Use(func(c *fiber.Ctx) error {
		defer ResumeBackgroundWork()
		SuspendBackgroundWork()
		return c.Next()
	})

	// API
	api := app.Group("/api")
	api.Get("/pseudos", pseudos)
	api.Get("/collections", collections)
	api.Get("/collections/:collection/albums", albums)
	api.Put("/collections/:collection/albums", addAlbum)
	api.Get("/collections/:collection/albums/:album", album)
	api.Get("/collections/:collection/albums/:album/photos/:photo/thumb", thumb)
	api.Get("/collections/:collection/albums/:album/photos/:photo/info", info)
	api.Get("/collections/:collection/albums/:album/photos/:photo/files/:file", file)
	api.Put("/collections/:collection/albums/:album/pseudos", saveToPseudo)
	api.Delete("/collections/:collection/albums/:album/pseudos", saveToPseudo)
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(map[string]bool{"ok": true})
	})
	// Create a catch-all route for /api/*
	// Add handlers only for HTTP (TODO: fiber v3 should fix)
	for _, method := range fiber.DefaultMethods {
		api.Add(method, "/*", func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusNotFound).SendString("Not found")
		})
	}

	// WebDAV
	if !config.webdavDisabled {
		webdavHandler := &webdav.Handler{
			Prefix:     "/webdav",
			FileSystem: CreateWebDavFS(config.collections),
			LockSystem: webdav.NewMemLS(),
			Logger: func(r *http.Request, err error) {
				if err != nil {
					fmt.Printf("WebDAV %s: %s, ERROR: %s\n", r.Method, r.URL, err)
				}
			},
		}
		// Add handlers only for methods required by WebDAV (TODO: fiber v3 should fix)
		webdav := app.Group("/webdav")
		for _, method := range WebDAVMethods {
			webdav.Add(method, "*", adaptor.HTTPHandler(webdavHandler))
		}
		log.Println("WebDAV will be available at http://" + serverAddr + "/webdav")
	}

	// Frontend
	// serve Single Page application on "/"
	// assume static file at ../build folder
	app.Static("/", "../build", fiber.Static{Compress: true, MaxAge: 31536000})
	app.Get("/*", func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderCacheControl, HeaderCacheControl)
		return c.SendFile("../build/index.html")
	})

	// Start server
	log.Println("Starting server: http://" + serverAddr)
	log.Fatal(app.Listen(serverAddr))
}
