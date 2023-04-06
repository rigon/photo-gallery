package main

import (
	"bufio"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"golang.org/x/net/webdav"
)

var config CmdArgs

func GetCollection(collection string) (*Collection, error) {
	val, present := config.collections[collection]
	if !present {
		return nil, errors.New("invalid collection")
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
	album, err := collection.GetAlbumWithPhotos(albumName, true)
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
	var err error
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	albumName := c.Params("album")
	photoName := c.Params("photo")

	// Fetch album with photos including info
	album, err := collection.GetAlbumWithPhotos(albumName, false)
	if err != nil {
		return err
	}

	// Find photo
	photo, err := album.FindPhoto(photoName)
	if err != nil {
		return err
	}

	AddWorkPhoto(collection, album, photo, c.Response().BodyWriter())
	return nil
}

func file(c *fiber.Ctx) error {
	collection, err := GetCollection(c.Params("collection"))
	if err != nil {
		return err
	}
	albumName := c.Params("album")
	photoName := c.Params("photo")
	fileNumber, err := strconv.Atoi(c.Params("file"))
	if err != nil {
		return err
	}

	// Fetch photo from cache
	album, err := collection.cache.GetAlbum(albumName)
	if err != nil {
		return err
	}

	// Find photo
	photo, err := album.FindPhoto(photoName)
	if err != nil {
		return err
	}

	// Get file
	file, err := photo.GetFile(fileNumber)
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

	c.Set("Content-Type", file.Type)
	c.Set("Content-Disposition", "attachment; filename=\""+file.Name()+"\"")
	return c.SendFile(file.Path)
}

func saveToPseudo(c *fiber.Ctx) error {
	var saveTo PseudoAlbum

	fromCollection := c.Params("collection")
	fromAlbum := c.Params("album")
	fromPhoto := c.Params("photo")
	// Decode body
	if err := c.BodyParser(&saveTo); err != nil {
		return err
	}

	collection, err := GetCollection(saveTo.Collection)
	if err != nil {
		return err
	}

	album, err := collection.GetAlbum(saveTo.Album)
	if err != nil {
		return err
	}

	// Add photo to pseudo album
	if c.Method() == "PUT" {
		album.SavePhotoToPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
	// Remove photo from pseudo album
	if c.Method() == "DELETE" {
		album.RemovePhotoFromPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
	return c.JSON(map[string]bool{"ok": true})
}

func main() {
	config = ParseCmdArgs()
	serverAddr := config.host + ":" + strconv.Itoa(config.port)
	log.Println("Collections:", config.collections)

	for _, collection := range config.collections {
		collection.cache.Init(*collection)
		defer collection.cache.End()
	}

	// Cache thumbnails in background
	if config.cacheThumbnails {
		log.Println("Generating thumbnails in background...")
		go func() {
			for _, c := range config.collections {
				c.CreateThumbnails()
			}
		}()
	}

	// Server
	app := fiber.New(fiber.Config{
		RequestMethods: mergeWithoutDuplicates(fiber.DefaultMethods, WebDAVMethods),
		UnescapePath:   true,
	})

	// Middlewares
	app.Use(logger.New(logger.Config{
		Format: "[${latency}] ${status} - ${method} ${path}\n",
	}))

	// API
	api := app.Group("/api")
	api.Get("/pseudos", pseudos)
	api.Get("/collections", collections)
	api.Get("/collection/:collection/albums", albums)
	api.Put("/collection/:collection/album", addAlbum)
	api.Get("/collection/:collection/album/:album", album)
	api.Get("/collection/:collection/album/:album/photo/:photo/thumb", thumb)
	api.Get("/collection/:collection/album/:album/photo/:photo/file/:file", file)
	api.Put("/collection/:collection/album/:album/photo/:photo/saveToPseudo", saveToPseudo)
	api.Delete("/collection/:collection/album/:album/photo/:photo/saveToPseudo", saveToPseudo)
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
	app.Static("/", "../build", fiber.Static{ByteRange: true, Next: func(c *fiber.Ctx) bool {
		return false
	}})
	app.Get("/*", func(ctx *fiber.Ctx) error {
		return ctx.SendFile("../build/index.html")
	})

	// Start server
	log.Println("Starting server: http://" + serverAddr)
	log.Fatal(app.Listen(serverAddr))
}
