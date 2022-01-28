package main

import (
	"encoding/json"
	"fmt"
	"image/jpeg"
	"io"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/adrium/goheif"
	"github.com/gorilla/mux"
)

var PhotosPath string

// spaHandler implements the http.Handler interface, so we can use it
// to respond to HTTP requests. The path to the static directory and
// path to the index file within that static directory are used to
// serve the SPA in the given static directory.
type spaHandler struct {
	staticPath string
	indexPath  string
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// on the SPA handler. If a file is found, it will be served. If not, the
// file located at the index path on the SPA handler will be served. This
// is suitable behavior for serving an SPA (single page application).
func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// get the absolute path to prevent directory traversal
	path := r.URL.Path
	// path, err := filepath.Abs(r.URL.Path)
	// if err != nil {
	// 	// if we failed to get the absolute path respond with a 400 bad request
	// 	// and stop
	// 	http.Error(w, err.Error(), http.StatusBadRequest)
	// 	return
	// }

	// prepend the path with the path to the static directory
	path = filepath.Join(h.staticPath, path)

	fmt.Println(path)
	// check whether a file exists at the given path
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		// file does not exist, serve index.html
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		// if we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// otherwise, use http.FileServer to serve the static dir
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

func albums(w http.ResponseWriter, req *http.Request) {
	var albums []string

	files, err := ioutil.ReadDir(PhotosPath)
	if err != nil {
		log.Fatal(err)
	}

	for _, file := range files {
		//fmt.Println(file.Name(), file.IsDir())
		if file.IsDir() {
			albums = append(albums, file.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(albums)
}

type Photo struct {
	Src    string `json:"src"`
	Thumb  string `json:"thumb"`
	Title  string `json:"title"`
	Width  int    `default:"1" json:"width"`
	Height int    `default:"1" json:"height"`
}

func album(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	albumName := vars["album"]
	var photos []*Photo

	files, err := ioutil.ReadDir(filepath.Join(PhotosPath, albumName))
	if err != nil {
		log.Fatal(err)
	}
	for _, file := range files {
		//fmt.Println(file.Name(), file.IsDir())
		if !file.IsDir() {
			photo := new(Photo)
			photo.Src = "/album/" + albumName + "/photo/" + file.Name()
			photo.Thumb = "/album/" + albumName + "/thumb/" + file.Name()
			photo.Title = file.Name()
			photo.Height = 1 + rand.Intn(2)
			photo.Width = 1 + rand.Intn(3)
			photos = append(photos, photo)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(photos)
}

func photo(w http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	albumName := vars["album"]
	photoName := vars["photo"]
	filename := filepath.Join(PhotosPath, albumName, photoName)
	if strings.HasSuffix(photoName, ".heic") {
		convertPhoto(w, filename)
	} else {
		http.ServeFile(w, req, filepath.Join(PhotosPath, albumName, photoName))
	}
}

var thumb = photo
var live = photo

func convertPhoto(w io.Writer, filename string) {
	fi, err := os.Open(filename)
	if err != nil {
		log.Fatal(err)
	}
	defer fi.Close()

	exif, err := goheif.ExtractExif(fi)
	if err != nil {
		log.Printf("Warning: no EXIF from %s: %v\n", filename, err)
	}

	img, err := goheif.Decode(fi)
	if err != nil {
		log.Fatalf("Failed to parse %s: %v\n", filename, err)
	}

	wimg, _ := newWriterExif(w, exif)
	err = jpeg.Encode(wimg, img, nil)
	if err != nil {
		log.Fatalf("Failed to encode %s: %v\n", filename, err)
	}

	log.Printf("Convert %s successfully\n", filename)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	argLength := len(os.Args[1:])
	fmt.Printf("Arg length is %d\n", argLength)
	if argLength != 1 {
		fmt.Println("Invalid number of arguments")
		return
	}
	PhotosPath = os.Args[1]

	router := mux.NewRouter()
	router.HandleFunc("/albums", albums)
	router.HandleFunc("/album/{album}", album)
	router.HandleFunc("/album/{album}/photo/{photo}", photo)
	router.HandleFunc("/album/{album}/thumb/{photo}", thumb)
	router.HandleFunc("/album/{album}/live/{photo}", live)
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		// an example API handler
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})

	spa := spaHandler{
		staticPath: "photo-gallery/build",
		indexPath:  "index.html",
	}
	router.PathPrefix("/").Handler(spa)

	srv := &http.Server{
		Handler: router,
		Addr:    "127.0.0.1:3080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
