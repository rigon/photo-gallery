package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/spf13/pflag"
	"golang.org/x/net/webdav"
)

type App struct {
	Collections map[string]*Collection
}

var app App

func collections(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetCollections(app.Collections))
}

func pseudos(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(GetPseudoAlbums(app.Collections))
}

func albums(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := GetCollection(vars["collection"])

	albums, err := ListAlbums(*collection)
	if err != nil {
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(albums)
}

func album(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := GetCollection(vars["collection"])
	albumName := vars["album"]

	album, err := GetAlbum(*collection, albumName)
	if err != nil {
		log.Println(err)
	}

	// Cache selected album
	collection.loadedAlbum = album

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(album)
}

func addAlbum(w http.ResponseWriter, req *http.Request) {
	var album AddAlbumQuery
	vars := mux.Vars(req)
	collection := GetCollection(vars["collection"])
	// Decode body
	reqBody, _ := ioutil.ReadAll(req.Body)
	json.Unmarshal(reqBody, &album)
	// Add album
	collection.AddAlbum(album)
}

func photo(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	collection := GetCollection(vars["collection"])
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
	photo.GetImage(fileNumber, w)
}

func thumb(w http.ResponseWriter, req *http.Request) {
	var err error
	vars := mux.Vars(req)
	collection := GetCollection(vars["collection"])
	albumName := vars["album"]
	photoName := vars["photo"]
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

	AddWorkPhoto(w, *collection, *collection.loadedAlbum, *photo)
}

func saveToPseudo(w http.ResponseWriter, req *http.Request) {
	var saveTo PseudoAlbum
	var err error
	vars := mux.Vars(req)
	fromCollection := vars["collection"]
	fromAlbum := vars["album"]
	fromPhoto := vars["photo"]
	// Decode body
	reqBody, _ := ioutil.ReadAll(req.Body)
	json.Unmarshal(reqBody, &saveTo)

	collection := GetCollection(saveTo.Collection)

	// Check if cached album is the one we want
	if collection.loadedAlbum == nil || collection.loadedAlbum.Name != saveTo.Name {
		collection.loadedAlbum, err = GetAlbum(*collection, saveTo.Name)
		if err != nil {
			log.Fatal(err)
		}
	}

	// Add photo to pseudo album
	if req.Method == "PUT" {
		collection.loadedAlbum.SavePhotoToPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
	// Remove photo from pseudo album
	if req.Method == "DELETE" {
		collection.loadedAlbum.RemovePhotoFromPseudoAlbum(fromCollection, fromAlbum, fromPhoto, collection)
	}
}

func main() {
	//rand.Seed(time.Now().UnixNano())

	var cacheThumbnails, webdavDisabled bool
	var collectionArgs []string
	pflag.StringArrayVarP(&collectionArgs, "collection", "c", collectionArgs, `Specify a new collection. Example name=Photos,path=/photos,thumbs=/tmp
List of possible options:
  index          Position in the collection list
  name           Name of the collection
  path           Path to load the albums from
  thumbs         Path to store the tumbnails
  hide=false     Hide the collection from the list (does not affect webdav)
  rename=true    Rename files instead of overwriting them
  readonly=false`)
	pflag.BoolVarP(&cacheThumbnails, "cache-thumbnails", "b", false, "Generate thumbnails in background when the application starts")
	pflag.BoolVar(&webdavDisabled, "disable-webdav", false, "Disable WebDAV")
	pflag.Parse()

	app.Collections = make(map[string]*Collection)
	for i, c := range collectionArgs {
		collection := new(Collection)
		collection.Index = i
		collection.Hide = false
		collection.ReadOnly = false
		collection.RenameOnReplace = true

		reader := csv.NewReader(strings.NewReader(c))
		ss, err := reader.Read()
		if err != nil {
			log.Println(err)
		}
		for _, pair := range ss {
			kv := strings.SplitN(pair, "=", 2)
			if len(kv) != 2 {
				log.Printf("%s must be formatted as key=value\n", pair)
			}
			switch kv[0] {
			case "index":
				collection.Index, err = strconv.Atoi(kv[1])
				if err != nil {
					log.Println(err)
				}
			case "name":
				collection.Name = kv[1]
			case "path":
				collection.PhotosPath = kv[1]
			case "thumbs":
				collection.ThumbsPath = kv[1]
			case "rename":
				collection.RenameOnReplace, err = strconv.ParseBool(kv[1])
				if err != nil {
					log.Println(err)
				}
			case "readonly":
				collection.ReadOnly, err = strconv.ParseBool(kv[1])
				if err != nil {
					log.Println(err)
				}
			case "hide":
				collection.Hide, err = strconv.ParseBool(kv[1])
				if err != nil {
					log.Println(err)
				}
			default:
				log.Printf("%s option is not valid\n", kv[0])
			}
		}

		app.Collections[collection.Name] = collection
	}
	log.Println("Collections:", app.Collections)

	// Cache thumbnails in background
	if cacheThumbnails {
		log.Println("Generating thumbnails in background...")
		go func() {
			for _, c := range app.Collections {
				albums, _ := ListAlbums(*c)
				for _, album := range albums {
					album.GenerateThumbnails(*c)
				}
			}
		}()
	}

	router := mux.NewRouter()
	// API
	router.HandleFunc("/api/pseudos", pseudos)
	router.HandleFunc("/api/collections", collections)
	router.HandleFunc("/api/collection/{collection}/albums", albums)
	router.HandleFunc("/api/collection/{collection}/album", addAlbum).Methods("PUT")
	router.HandleFunc("/api/collection/{collection}/album/{album}", album)
	router.HandleFunc("/api/collection/{collection}/album/{album}/photo/{photo}/thumb", thumb)
	router.HandleFunc("/api/collection/{collection}/album/{album}/photo/{photo}/saveToPseudo", saveToPseudo).Methods("PUT")
	router.HandleFunc("/api/collection/{collection}/album/{album}/photo/{photo}/saveToPseudo", saveToPseudo).Methods("DELETE")
	router.HandleFunc("/api/collection/{collection}/album/{album}/photo/{photo}/file/{file}", photo)
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		// an example API handler
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})
	// Create a catch-all route for /api/*
	router.PathPrefix("/api/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})

	// WebDAV
	if !webdavDisabled {
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
		log.Println("WebDAV will be available at http://localhost:3080/webdav")
	}

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
	log.Println("Starting server: http://localhost:3080")
	log.Fatal(srv.ListenAndServe())
}
