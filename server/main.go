package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"golang.org/x/net/webdav"
)

type Collection struct {
	Name            string
	PhotosPath      string
	ThumbsPath      string
	Album           *Album
	ReadOnly        bool
	RenameOnReplace bool
}

type App struct {
	Collections []*Collection
}

var app App

func getCollection(collection string) Collection {
	i, err := strconv.Atoi(collection)
	if err != nil {
		log.Fatal(err)
	}

	if i < 0 || i >= len(app.Collections) {
		log.Fatal(err)
	}

	return *app.Collections[i]
}

func collections(w http.ResponseWriter, req *http.Request) {
	collections := make([]string, len(app.Collections))

	for i, c := range app.Collections {
		collections[i] = c.Name
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(collections)
}

func albums(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := getCollection(vars["collection"])

	albums, err := ListAlbums(collection)
	if err != nil {
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(albums)
}

func album(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := getCollection(vars["collection"])
	albumName := vars["album"]

	album, err := GetAlbum(collection, albumName)
	if err != nil {
		log.Fatal(err)
	}

	// Cache selected album
	collection.Album = album

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(album)
}

func photo(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := getCollection(vars["collection"])
	albumName := vars["album"]
	photoName := vars["photo"]
	fileNumber, err := strconv.Atoi(vars["file"])
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
	if collection.Album == nil || collection.Album.Name != albumName {
		collection.Album, err = GetAlbum(collection, albumName)
		if err != nil {
			log.Fatal(err)
		}
	}

	photo, err := collection.Album.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	//mime.TypeByExtension()
	photo.GetImage(fileNumber, w)
}

func thumb(w http.ResponseWriter, req *http.Request) {
	var err error
	vars := mux.Vars(req)
	collection := getCollection(vars["collection"])
	albumName := vars["album"]
	photoName := vars["photo"]
	log.Printf("Thumb [%s] %s\n", albumName, photoName)

	// Check if cached album is the one we want
	if collection.Album == nil || collection.Album.Name != albumName {
		collection.Album, err = GetAlbum(collection, albumName)
		if err != nil {
			log.Fatal(err)
		}
	}

	photo, err := collection.Album.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	photo.GetThumbnail(w, collection, *collection.Album)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	argLength := len(os.Args[1:])
	fmt.Printf("Arg length is %d\n", argLength)
	if argLength != 2 {
		fmt.Println("Invalid number of arguments")
		return
	}

	app.Collections = make([]*Collection, 2)
	app.Collections[0] = new(Collection)
	app.Collections[0].Name = "Default"
	app.Collections[0].PhotosPath = os.Args[1]
	app.Collections[0].ThumbsPath = os.Args[2]
	app.Collections[0].RenameOnReplace = true

	app.Collections[1] = new(Collection)
	app.Collections[1].Name = "Default 2"
	app.Collections[1].PhotosPath = os.Args[1]
	app.Collections[1].ThumbsPath = os.Args[2]
	app.Collections[1].RenameOnReplace = true

	router := mux.NewRouter()

	// API
	router.HandleFunc("/collections", collections)
	router.HandleFunc("/collection/{collection}/albums", albums)
	router.HandleFunc("/collection/{collection}/album/{album}", album)
	router.HandleFunc("/collection/{collection}/album/{album}/photo/{photo}/thumb", thumb)
	router.HandleFunc("/collection/{collection}/album/{album}/photo/{photo}/file/{file}", photo)
	router.HandleFunc("/collection/{collection}/api/health", func(w http.ResponseWriter, r *http.Request) {
		// an example API handler
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	// WebDAV
	wd := &webdav.Handler{
		Prefix:     "/webdav",
		FileSystem: CreateWebDavFS(app.Collections),
		LockSystem: webdav.NewMemLS(),
		Logger: func(r *http.Request, err error) {
			if err != nil {
				fmt.Printf("WebDAV %s: %s, ERROR: %s\n", r.Method, r.URL, err)
			} else {
				fmt.Printf("WebDAV %s: %s \n", r.Method, r.URL)
			}
		},
	}
	router.PathPrefix("/webdav").Handler(wd)

	// Frontend
	spa := spaHandler{
		staticPath: "../build",
		indexPath:  "index.html",
	}
	router.PathPrefix("/").Handler(spa)

	// Start server
	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:3080",
		// // Good practice: enforce timeouts for servers you create!
		// WriteTimeout: 15 * time.Second,
		// ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
