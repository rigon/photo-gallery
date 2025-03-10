package main

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/shirou/gopsutil/disk"
)

type Collection struct {
	Index           int
	Name            string
	PhotosPath      string
	ThumbsPath      string
	DbPath          string
	Hide            bool
	ReadOnly        bool
	RenameOnReplace bool
	cache           Cache
	muxAlbumMap     sync.Mutex
	muxsAlbums      map[string]*sync.Mutex
}

type CollectionInfo struct {
	Name    string            `json:"name"`
	Storage CollectionStorage `json:"storage"`
}
type CollectionStorage struct {
	Size       string `json:"size"`
	Free       string `json:"free"`
	Used       string `json:"used"`
	Percentage int    `json:"percentage"`
}

type AddAlbumQuery struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func NewCollection() *Collection {
	return &Collection{
		muxsAlbums: make(map[string]*sync.Mutex),
	}
}

// List all collections
func GetCollections(collections map[string]*Collection) []CollectionInfo {
	list := make([]CollectionInfo, len(collections))

	for _, c := range collections {
		if !c.Hide {
			list[c.Index] = c.Info()
		}
	}

	return list
}

// Get string representation of a collection
func (c *Collection) String() string {
	return fmt.Sprintf("%s (%s)", c.Name, c.PhotosPath)
}

// Info about the collection
func (c *Collection) Info() CollectionInfo {
	st, err := c.StorageUsage()
	if err != nil {
		log.Println("Cannot retrieve storage usage for " + c.Name + ": " + err.Error())
	}
	return CollectionInfo{Name: c.Name, Storage: st}
}

func (collection *Collection) GetAlbums() []*Album {
	return collection.cache.GetCachedAlbums()
}

// Load all albums from disk
func (c *Collection) LoadAlbums() ([]*Album, error) {
	albums := make([]*Album, 0)
	files, err := os.ReadDir(c.PhotosPath)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		fileInfo, err := file.Info()
		if err == nil {
			album, err := readAlbum(fileInfo)
			if err == nil {
				albums = append(albums, album)
			}
		}
	}
	// Load cached album
	go c.cache.LoadCachedAlbums(albums...)

	return albums, nil
}

func readAlbum(file fs.FileInfo) (*Album, error) {
	var album Album
	filename := file.Name()

	// Skip hidden files
	if strings.HasPrefix(filename, ".") {
		return nil, errors.New("album not found")
	}

	// Album
	if file.IsDir() {
		album.Name = filename
		album.Date = file.ModTime().String()
		album.IsPseudo = false
		return &album, nil
	}

	// Pseudo-album
	lowerName := strings.ToLower(filename)
	if file.Mode().IsRegular() && strings.HasSuffix(lowerName, PSEUDO_ALBUM_EXT) {
		album.Name = filename[:len(filename)-len(PSEUDO_ALBUM_EXT)]
		album.Date = file.ModTime().String()
		album.IsPseudo = true
		return &album, nil
	}

	// Error
	return nil, errors.New("album not found")
}

func (collection *Collection) GetAlbum(albumName string) (*Album, error) {
	return collection.getAlbumOpts(albumName, true, false)
}
func (collection *Collection) GetAlbumBackground(albumName string) (*Album, error) {
	return collection.getAlbumOpts(albumName, true, true)
}
func (collection *Collection) GetAlbumNoLoading(albumName string) (*Album, error) {
	return collection.getAlbumOpts(albumName, false, false)
}
func (collection *Collection) getAlbumOpts(albumName string, loadPhotos bool, runningInBackground bool) (*Album, error) {
	album, present := collection.cache.GetCachedAlbum(albumName)
	if !present {
		return nil, errors.New("album not found: " + albumName)
	}
	if loadPhotos {
		album.LoadPhotos(collection, runningInBackground)
	}
	return album, nil
}

// // Regular album (i.e. folder)
// filename := filepath.Join(collection.PhotosPath, albumName)
// file, err := os.Stat(filename)
// if err == nil { // Found, read album
// 	album, err = readAlbum(file)
// 	if err != nil {
// 		return nil, err
// 	}
// } else {
// 	// Pseudo album (i.e. file)
// 	filename = filepath.Join(collection.PhotosPath, albumName+PSEUDO_ALBUM_EXT)
// 	file, err = os.Stat(filename)
// 	if err == nil { // Found, read album
// 		album, err = readAlbum(file)
// 		if err != nil {
// 			return nil, err
// 		}
// 	} else {
// 		return nil, errors.New("album not found: " + albumName)
// 	}
// }

// // Load album
// if loadPhotos {
// 	album.LoadPhotos(collection, false, false)
// }

func (c *Collection) AddAlbum(info AddAlbumQuery) error {
	name := info.Name
	if info.Type == "pseudo" {
		name += PSEUDO_ALBUM_EXT
	}
	p := filepath.Join(c.PhotosPath, name)

	// File or folder already exists, cannot overwrite
	if _, err := os.Stat(p); !os.IsNotExist(err) {
		return err
	}

	switch info.Type {
	case "regular":
		// Create folder
		err := os.Mkdir(p, os.ModeDir)
		if err != nil {
			return err
		}
	case "pseudo":
		// Create if does not exist
		file, err := os.OpenFile(p, os.O_RDWR|os.O_CREATE, 0666)
		if err != nil {
			return err
		}
		// Just touching the file
		file.Close()
	default:
		return errors.New("Invalid album type " + info.Type)
	}

	// Save to cache
	//c.cache.AddToListAlbums(&Album{Name: info.Name})
	return nil
}

func (collection *Collection) GetPhoto(album *Album, photoId string) (*Photo, error) {
	return collection.cache.GetPhoto(album.Name, photoId)
}

func (collection *Collection) StorageUsage() (CollectionStorage, error) {
	di, err := disk.Usage(collection.PhotosPath)
	if err != nil {
		return CollectionStorage{}, err
	}
	percentage := (float64(di.Total-di.Free) / float64(di.Total)) * 100
	return CollectionStorage{
		Size:       FormatBytes(di.Total),
		Free:       FormatBytes(di.Free),
		Used:       FormatBytes(di.Total - di.Free),
		Percentage: int(math.Round(percentage)),
	}, nil
}

func (c *Collection) LockAlbum(id string) {
	c.muxAlbumMap.Lock()
	mux, ok := c.muxsAlbums[id]
	if !ok {
		mux = new(sync.Mutex)
		c.muxsAlbums[id] = mux
	}
	c.muxAlbumMap.Unlock()
	mux.Lock()
}

func (c *Collection) UnlockAlbum(id string) {
	c.muxAlbumMap.Lock()
	mux, ok := c.muxsAlbums[id]
	if ok {
		mux.Unlock()
		//delete(c.muxsAlbums, id)
	}
	c.muxAlbumMap.Unlock()
}
