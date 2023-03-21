package main

import (
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

func GetCollection(collection string) *Collection {
	val, present := config.collections[collection]
	if !present {
		log.Println("invalid collection")
	}
	return val
}

func collections(c *fiber.Ctx) error {
	return c.JSON(GetCollections(config.collections))
}

func pseudos(c *fiber.Ctx) error {
	return c.JSON(GetPseudoAlbums(config.collections))
}

func albums(c *fiber.Ctx) error {
	collection := GetCollection(c.Params("collection"))

	albums, err := ListAlbums(*collection)
	if err != nil {
		log.Fatal(err)
	}

	return c.JSON(albums)
}

func album(c *fiber.Ctx) error {
	collection := GetCollection(c.Params("collection"))
	albumName := c.Params("album")
	fmt.Println("albumName", albumName)

	album, err := GetAlbum(*collection, albumName)
	if err != nil {
		log.Println(err)
	}

	// Cache selected album
	collection.loadedAlbum = album

	return c.JSON(album)
}

func addAlbum(c *fiber.Ctx) error {
	var album AddAlbumQuery
	collection := GetCollection(c.Params("collection"))
	// Decode body
	if err := c.BodyParser(&album); err != nil {
		return err
	}
	// Add album
	return collection.AddAlbum(album)
}

func photo(c *fiber.Ctx) error {
	collection := GetCollection(c.Params("collection"))
	albumName := c.Params("album")
	photoName := c.Params("photo")
	fileNumber, err := strconv.Atoi(c.Params("file"))
	if err != nil {
		log.Fatal(err)
	}
	// filename := filepath.Join(config.PhotosPath, albumName, photoName)
	// if strings.HasSuffix(strings.ToLower(photoName), ".heic") {
	// 	convertPhoto(w, filename)
	// } else {
	//http.ServeFile(w, req, filepath.Join(config.PhotosPath, albumName, photoName))
	// }
	log.Printf("Photo [%s] %s\n", albumName, photoName)

	// Check if cached album is the one we want
	if collection.loadedAlbum == nil || collection.loadedAlbum.Name != albumName {
		collection.loadedAlbum, err = GetAlbum(*collection, albumName)
		if err != nil {
			log.Fatal(err)
		}
	}

	photo, err := collection.loadedAlbum.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	//mime.TypeByExtension()
	return photo.GetImage(fileNumber, c.Response().BodyWriter())
}

func thumb(c *fiber.Ctx) error {
	var err error
	collection := GetCollection(c.Params("collection"))
	albumName := c.Params("album")
	photoName := c.Params("photo")
	//log.Printf("Thumb [%s] %s\n", albumName, photoName)

	// Check if cached album is the one we want
	if collection.loadedAlbum == nil || collection.loadedAlbum.Name != albumName {
		collection.loadedAlbum, err = GetAlbum(*collection, albumName)
		if err != nil {
			log.Fatal(err)
		}
	}

	photo, err := collection.loadedAlbum.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	AddWorkPhoto(c.Response().BodyWriter(), *collection, *collection.loadedAlbum, *photo)
	return nil
}

func saveToPseudo(c *fiber.Ctx) error {
	var saveTo PseudoAlbum
	var err error
	fromCollection := c.Params("collection")
	fromAlbum := c.Params("album")
	fromPhoto := c.Params("photo")
	// Decode body
	if err := c.BodyParser(&saveTo); err != nil {
		return err
	}

	collection := GetCollection(saveTo.Collection)

	// Check if cached album is the one we want
	if collection.loadedAlbum == nil || collection.loadedAlbum.Name != saveTo.Name {
		collection.loadedAlbum, err = GetAlbum(*collection, saveTo.Name)
		if err != nil {
			log.Fatal(err)
		}
	}

	// Add photo to pseudo album
	if c.Method() == "PUT" {
		collection.loadedAlbum.SavePhotoToPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
	// Remove photo from pseudo album
	if c.Method() == "DELETE" {
		collection.loadedAlbum.RemovePhotoFromPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
	return c.JSON(map[string]bool{"ok": true})
}

func main() {
	cmdArgs := ParseCmdArgs()
	serverAddr := cmdArgs.host + ":" + strconv.Itoa(cmdArgs.port)
	log.Println("Collections:", cmdArgs.collections)

	for _, collection := range cmdArgs.collections {
		collection.OpenDB()
		defer collection.CloseDB()
	}
	config.collections = cmdArgs.collections

	// Cache thumbnails in background
	if cmdArgs.cacheThumbnails {
		log.Println("Generating thumbnails in background...")
		go func() {
			for _, c := range cmdArgs.collections {
				albums, _ := ListAlbums(*c)
				for _, album := range albums {
					album.GenerateThumbnails(*c)
				}
			}
		}()
	}

	// Server
	app := fiber.New(fiber.Config{
		RequestMethods: mergeWithoutDuplicates(fiber.DefaultMethods, WebDAVMethods),
		UnescapePath:   true,
	})

	// Middlewares
	app.Use(logger.New())

	// API
	api := app.Group("/api")
	api.Get("/pseudos", pseudos)
	api.Get("/collections", collections)
	api.Get("/collection/:collection/albums", albums)
	api.Put("/collection/:collection/album", addAlbum)
	api.Get("/collection/:collection/album/:album", album)
	api.Get("/collection/:collection/album/:album/photo/:photo/thumb", thumb)
	api.Put("/collection/:collection/album/:album/photo/:photo/saveToPseudo", saveToPseudo)
	api.Delete("/collection/:collection/album/:album/photo/:photo/saveToPseudo", saveToPseudo)
	api.Get("/collection/:collection/album/:album/photo/:photo/file/:file", photo)
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
	if !cmdArgs.webdavDisabled {
		webdavHandler := &webdav.Handler{
			Prefix:     "/webdav",
			FileSystem: CreateWebDavFS(cmdArgs.collections),
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
	app.Static("/", "../build")
	app.Get("/*", func(ctx *fiber.Ctx) error {
		return ctx.SendFile("../build/index.html")
	})

	// Start server
	log.Println("Starting server: http://" + serverAddr)
	log.Fatal(app.Listen(serverAddr))
}
