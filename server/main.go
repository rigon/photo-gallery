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
)

type AppConfig struct {
	PhotosPath string
	ThumbsPath string
}

var config AppConfig

func albums(w http.ResponseWriter, req *http.Request) {
	var albums []*Album

	albums, err := ListAlbums(config)
	if err != nil {
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(albums)
}

func album(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	albumName := vars["album"]

	album, err := GetAlbum(config, albumName)
	if err != nil {
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(album)
}

func photo(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
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

	album, err := FindAlbum(config, albumName)
	if err != nil {
		log.Fatal(err)
	}

	photo, err := album.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	//mime.TypeByExtension()
	photo.GetImage(fileNumber, w)
}

func thumb(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	albumName := vars["album"]
	photoName := vars["photo"]
	log.Printf("Thumb [%s] %s\n", albumName, photoName)

	album, err := FindAlbum(config, albumName)
	if err != nil {
		log.Fatal(err)
	}

	photo, err := album.FindPhoto(photoName)
	if err != nil {
		log.Fatal(err)
	}

	photo.GetThumbnail(w, config, *album)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	argLength := len(os.Args[1:])
	fmt.Printf("Arg length is %d\n", argLength)
	if argLength != 2 {
		fmt.Println("Invalid number of arguments")
		return
	}

	config.PhotosPath = os.Args[1]
	config.ThumbsPath = os.Args[2]

	router := mux.NewRouter()
	router.HandleFunc("/albums", albums)
	router.HandleFunc("/album/{album}", album)
	router.HandleFunc("/album/{album}/photo/{photo}/thumb", thumb)
	router.HandleFunc("/album/{album}/photo/{photo}/file/{file}", photo)
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		// an example API handler
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	spa := spaHandler{
		staticPath: "../build",
		indexPath:  "index.html",
	}
	router.PathPrefix("/").Handler(spa)

	srv := &http.Server{
		Handler: router,
		Addr:    "0.0.0.0:3080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
