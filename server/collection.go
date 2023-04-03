package main

import (
	"errors"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"math"
	"os"
	"path/filepath"
	"strings"

	"github.com/dustin/go-humanize"
	"github.com/shirou/gopsutil/disk"
)

type Collection struct {
	Index           int
	Name            string
	PhotosPath      string
	ThumbsPath      string
	Hide            bool
	ReadOnly        bool
	RenameOnReplace bool
	cache           Cache
}

type CollectionInfo struct {
	Name    string            `json:"name"`
	Storage CollectionStorage `json:"storage"`
}
type CollectionStorage struct {
	Size       string `json:"size"`
	Free       string `json:"free"`
	Percentage int    `json:"percentage"`
}

type AddAlbumQuery struct {
	Name string `json:"name"`
	Type string `json:"type"`
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
func (c Collection) String() string {
	return fmt.Sprintf("%s (%s)", c.Name, c.PhotosPath)
}

// Info about the collection
func (c Collection) Info() CollectionInfo {
	st, err := c.StorageUsage()
	if err != nil {
		log.Println("Cannot retrieve storage usage for " + c.Name + ": " + err.Error())
	}
	return CollectionInfo{Name: c.Name, Storage: *st}
}

// Lists all albums, however photos are not loaded together.
// For that use Album.GetPhotos()
func (c *Collection) GetAlbums() (albums []*Album, err error) {
	albums = make([]*Album, 0)

	files, err := ioutil.ReadDir(c.PhotosPath)
	if err != nil {
		return
	}

	for _, file := range files {
		album, err := readAlbum(file)
		if err == nil {
			albums = append(albums, album)
		}
	}
	// Save to cache in background
	c.cache.SetListAlbums(albums...)
	return
}

// Get album, however photos are not loaded together.
// For that use Album.GetPhotos()
func (c Collection) GetAlbum(albumName string) (*Album, error) {
	// Check first if album exists (must be cached)
	if !c.cache.IsAlbum(albumName) {
		return nil, errors.New("album not found")
	}
	// Check for regular album (i.e. folder)
	filename := filepath.Join(c.PhotosPath, albumName)
	file, err := os.Stat(filename)
	if err == nil { // no error
		return readAlbum(file)
	}
	// Check for pseudo album (i.e. file)
	filename = filepath.Join(c.PhotosPath, albumName+PSEUDO_ALBUM_EXT)
	file, err = os.Stat(filename)
	if err == nil { // no error
		return readAlbum(file)
	}
	// error
	return nil, errors.New("album not found")
}

func readAlbum(file fs.FileInfo) (*Album, error) {
	var album Album
	filename := file.Name()
	// Albums (do not show hidden folders)
	if file.IsDir() && !strings.HasPrefix(filename, ".") {
		album.Name = filename
		album.Date = file.ModTime().String()
		album.IsPseudo = false
		return &album, nil
	}
	// Pseudo Albums
	if file.Mode().IsRegular() && strings.HasSuffix(strings.ToUpper(filename), PSEUDO_ALBUM_EXT) {
		album.Name = filename[:len(filename)-len(PSEUDO_ALBUM_EXT)]
		album.Date = file.ModTime().String()
		album.IsPseudo = true
		return &album, nil
	}
	// Error
	return nil, errors.New("album not found")
}

// Get album with photos
func (c *Collection) GetAlbumWithPhotos(albumName string) (*Album, error) {
	// Check if album is in cache
	cachedAlbum, err := c.cache.GetAlbum(albumName)
	if err == nil {
		return cachedAlbum, nil
	}
	// If not in cache, read from disk
	album, err := c.GetAlbum(albumName)
	if err != nil {
		return album, err
	}

	// Get photos from the disk
	album.GetPhotos(c)
	// Fill photos with info in cache (e.g. height and width)
	c.cache.FillPhotosInfo(album)
	// ...and save to cache
	c.cache.mem.Set(album.Name, album)

	return album, nil
}

func (c Collection) AddAlbum(info AddAlbumQuery) error {
	name := info.Name
	if info.Type == "pseudo" {
		name += PSEUDO_ALBUM_EXT
	}
	p := filepath.Join(c.PhotosPath, name)

	// File or folder already exists, cannot overwrite
	if _, err := os.Stat(p); !errors.Is(err, os.ErrNotExist) {
		return err
	}

	switch info.Type {
	case "regular":
		// Create folder
		os.Mkdir(p, os.ModeDir)
	case "pseudo":
		file, err := os.Create(p)
		if err != nil {
			return err
		}
		// Just touching the file
		file.Close()
	default:
		return errors.New("Invalid album type " + info.Type)
	}

	// Save to cache in background
	go c.cache.AddToListAlbums(&Album{Name: info.Name})
	return nil
}

func (collection Collection) StorageUsage() (*CollectionStorage, error) {
	di, err := disk.Usage(collection.PhotosPath)
	if err != nil {
		return nil, err
	}
	percentage := (float64(di.Total-di.Free) / float64(di.Total)) * 100
	return &CollectionStorage{
		Size:       humanize.Bytes(di.Total),
		Free:       humanize.Bytes(di.Total - di.Free),
		Percentage: int(math.Round(percentage)),
	}, nil
}
