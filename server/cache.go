package main

import (
	"log"
	"path/filepath"
	"sync"

	"github.com/bluele/gcache"
	"github.com/timshannon/bolthold"
	bolt "go.etcd.io/bbolt"
)

const DB_NAME_SUFFIX = "-cache.db"

var dbInfo = DbInfo{
	Version: 4,
}

type DbInfo struct {
	Version int
}

type Cache struct {
	albums *sync.Map
	mem    gcache.Cache
	store  *bolthold.Store
}

// Init cache: boltdb and gcache
func (c *Cache) Init(collection *Collection, rebuildCache bool) error {
	// Disk cache
	var err error
	filename := filepath.Join(collection.ThumbsPath, collection.Name+DB_NAME_SUFFIX)
	c.store, err = bolthold.Open(filename, 0600, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Check DB version
	var current DbInfo
	err = c.store.Get("DbInfo", &current)
	if err != nil || current.Version != dbInfo.Version {
		log.Printf("Current DB version v%d is different than required v%d\n", current.Version, dbInfo.Version)
		if rebuildCache || err == bolthold.ErrNotFound {
			log.Printf("Recreating cache DB for collection %s at %s", collection.Name, filename)
			err := c.store.Bolt().Update(func(tx *bolt.Tx) error {
				tx.DeleteBucket([]byte("DbInfo"))
				tx.DeleteBucket([]byte("Photo"))
				tx.DeleteBucket([]byte("_index:Photo:date"))
				return c.store.TxInsert(tx, "DbInfo", dbInfo)
			})
			if err != nil {
				log.Fatal(err)
			}
		} else {
			log.Fatal("Run command with option -r enabled to recreate cache DB")
		}
	}

	// In-memory cache gcache
	c.mem = gcache.New(50).ARC().Build()

	// Cache for listing albums
	c.albums = new(sync.Map)

	// Ok
	return nil
}

// Release all caching resources
func (c Cache) End() error {
	c.mem.Purge()
	return c.store.Close()
}

func (c *Cache) SetListAlbums(albums ...*Album) {
	// Empty map
	c.albums.Range(func(key, value any) bool {
		c.albums.Delete(key)
		return true
	})

	c.AddToListAlbums(albums...)
}

func (c Cache) AddToListAlbums(albums ...*Album) {
	for _, album := range albums {
		c.albums.Store(album.Name, true)
	}
}

func (c *Cache) IsListAlbumsLoaded() bool {
	var ret = false
	c.albums.Range(func(key, value any) bool {
		ret = true
		return false
	})
	return ret
}

func (c Cache) IsAlbum(albumName string) bool {
	// Check if value is present
	_, present := c.albums.Load(albumName)
	return present
}

func (c Cache) GetAlbum(albumName string) (*Album, error) {
	// Check if value is present
	album, err := c.mem.Get(albumName)
	if err != nil || album == nil {
		return nil, err
	}
	return album.(*Album), nil
}

func (c Cache) SaveAlbum(album *Album) error {
	return c.mem.Set(album.Name, album)
}

// Fill photos with info in cache (e.g. height and width)
func (c Cache) FillPhotosInfo(album *Album) (err error) {
	var update []*Photo

	// Get photos that are in cache
	err = c.store.Bolt().View(func(tx *bolt.Tx) error {
		for _, photo := range album.Photos {
			var data Photo
			key := album.Name + ":" + photo.Title
			err := c.store.TxGet(tx, key, &data)
			// Does not require update
			if err == nil && data.Title == photo.Title && data.Thumb == photo.Thumb &&
				len(data.Files) == len(photo.Files) { // Validate some fields

				*photo = data
				continue
			}

			log.Printf("caching photo [%s] %s", album.Name, photo.Title)
			photo.Info()
			update = append(update, photo)
		}
		return nil
	})

	// Nothing to update
	if len(update) < 1 {
		return
	}

	// Update missing entries
	return c.store.Bolt().Update(func(tx *bolt.Tx) error {
		for _, photo := range update {
			key := album.Name + ":" + photo.Title
			err := c.store.TxUpsert(tx, key, photo)
			if err != nil {
				log.Println(err)
			}
		}
		return nil
	})
}
