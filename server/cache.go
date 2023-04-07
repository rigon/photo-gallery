package main

import (
	"log"
	"path/filepath"

	"github.com/bluele/gcache"
	"github.com/timshannon/bolthold"
	bolt "go.etcd.io/bbolt"
)

const DB_NAME_SUFFIX = "-cache.db"

var dbInfo = DbInfo{
	Version: 1,
}

type DbInfo struct {
	Version int
}

type Cache struct {
	albums map[string]struct{}
	mem    gcache.Cache
	store  *bolthold.Store
}

// Init cache, boltdb and go-cache
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
		if rebuildCache {
			log.Println("Running with option -r enabled: recreating cache DB...")
			c.store.Bolt().Update(func(tx *bolt.Tx) error {
				tx.DeleteBucket([]byte("DbInfo"))
				tx.DeleteBucket([]byte("Photo"))
				tx.DeleteBucket([]byte("_index:Photo:date"))
				return c.store.TxInsert(tx, "DbInfo", dbInfo)
			})
			log.Println("OK!")
		} else {
			log.Fatalln("Run with command with option -r enabled to recreate cache DB")
		}
	}

	// In-memonry cache
	c.mem = gcache.New(20).ARC().Build()

	// Ok
	return nil
}

// Release all caching resources
func (c Cache) End() error {
	c.mem.Purge()
	return c.store.Close()
}

func (c *Cache) SetListAlbums(albums ...*Album) {
	for k := range c.albums {
		delete(c.albums, k)
	}
	c.albums = make(map[string]struct{}) // Empty map
	c.AddToListAlbums(albums...)
}

func (c Cache) AddToListAlbums(albums ...*Album) {
	for _, album := range albums {
		c.albums[album.Name] = struct{}{}
	}
}

func (c *Cache) IsListAlbumsLoaded() bool {
	return len(c.albums) > 0
}

func (c Cache) IsAlbum(albumName string) bool {
	// Check if value is present
	_, present := c.albums[albumName]
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
			if err == nil {
				*photo = data
				continue
			}

			log.Println("photo info not found in cache")
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
