package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
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

	cmdArgs := ParseCmdArgs()
	serverAddr := cmdArgs.host + ":" + strconv.Itoa(cmdArgs.port)
	log.Println("Collections:", cmdArgs.collections)

	// Cache thumbnails in background
	if cmdArgs.cacheThumbnails {
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
	if !cmdArgs.webdavDisabled {
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
		log.Println("WebDAV will be available at " + serverAddr + "/webdav")
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
		Addr:    serverAddr,
		// // Good practice: enforce timeouts for servers you create!
		// WriteTimeout: 15 * time.Second,
		// ReadTimeout:  15 * time.Second,
	}
	log.Println("Starting server: " + serverAddr)
	log.Fatal(srv.ListenAndServe())
}
