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
	"sync"

	"github.com/dustin/go-humanize"
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

// Lists all albums, however photos are not loaded together.
// For that use Album.GetPhotos()
func (c *Collection) GetAlbums() ([]*Album, error) {
	albums := make([]*Album, 0)
	files, err := ioutil.ReadDir(c.PhotosPath)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		album, err := readAlbum(file)
		if err == nil {
			albums = append(albums, album)
		}
	}
	// Save to cache in background
	c.cache.SetListAlbums(albums...)
	return albums, nil
}

func (c *Collection) IsAlbum(albumName string) bool {
	// Cache list of albums if not cached
	if !c.cache.IsListAlbumsLoaded() {
		c.GetAlbums()
	}
	// Check if album exists (must be cached)
	return c.cache.IsAlbum(albumName)
}

// Get album, however photos are not loaded together.
// For that use Album.GetPhotos()
func (c *Collection) GetAlbum(albumName string) (*Album, error) {
	// Check if album exists
	if !c.IsAlbum(albumName) {
		return nil, errors.New("album not found: " + albumName)
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
func (c *Collection) GetAlbumWithPhotos(albumName string, forceUpdate bool, runningInBackground bool, photosToLoad ...PseudoAlbumEntry) (*Album, error) {
	if !forceUpdate {
		// Check if album is in cache
		cachedAlbum, err := c.cache.GetAlbum(albumName)
		if err == nil { // Is cached
			return cachedAlbum, nil
		}

		// If we try to get the cached album whilst another scan is in progress, it will fail.
		// So we try again but locking until the running scan is completed.
		// That way we do not need to lock getting albums from the cache in the first attempt.
		c.LockAlbum(albumName)
		cachedAlbum, err = c.cache.GetAlbum(albumName)
		c.UnlockAlbum(albumName)
		if err == nil { // Is cached
			return cachedAlbum, nil
		}
	}

	// Lock album to avoid concurrent scans
	c.LockAlbum(albumName)
	defer c.UnlockAlbum(albumName)

	// If not in cache, read from disk
	album, err := c.GetAlbum(albumName)
	if err != nil {
		return nil, err
	}

	// Get photos from the disk
	album.GetPhotos(c, runningInBackground, photosToLoad...)
	// ...and save to cache
	c.cache.SaveAlbum(album)

	return album, nil
}

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
	c.cache.AddToListAlbums(&Album{Name: info.Name})
	return nil
}

func (c *Collection) DeleteAlbum(album *Album) error {
	name := album.Name
	if album.IsPseudo {
		name += PSEUDO_ALBUM_EXT
	}
	p := filepath.Join(c.PhotosPath, name)

	// File or folder does not exist, cannot delete
	if _, err := os.Stat(p); os.IsNotExist(err) {
		return err
	}

	// Remove album folder (if empty) or pseudo-album file
	err := os.Remove(p)
	if err != nil {
		return err
	}

	// Remove from cache
	c.cache.RemoveFromListAlbums(album.Name)
	c.cache.RemoveAlbumSaved(album.Name)
	return nil
}

func (collection *Collection) StorageUsage() (CollectionStorage, error) {
	di, err := disk.Usage(collection.PhotosPath)
	if err != nil {
		return CollectionStorage{}, err
	}
	percentage := (float64(di.Total-di.Free) / float64(di.Total)) * 100
	return CollectionStorage{
		Size:       humanize.IBytes(di.Total),
		Free:       humanize.IBytes(di.Free),
		Used:       humanize.IBytes(di.Total - di.Free),
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
