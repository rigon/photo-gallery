package main

import (
	"log"
	"path/filepath"
	"sync"

	"github.com/bluele/gcache"
	"github.com/timshannon/bolthold"
	bolt "go.etcd.io/bbolt"
)

var dbInfo = DbInfo{
	Version: 9,
}

type DbInfo struct {
	Version int
}

const InfoBatchSize = 100

type Cache struct {
	albums    *sync.Map
	mem       gcache.Cache
	store     *bolthold.Store
	addInfoCh chan *Photo
	delInfoCh chan *Photo
	wgFlush   sync.WaitGroup
}

// Init cache: boltdb and gcache
func (c *Cache) Init(collection *Collection, rebuildCache bool) error {
	// Disk cache
	var err error

	// Find filename for cache
	// if collection.DbPath is a filename it will be located in thumbnails directory
	// Defaults something like /path/to/thumbs/collectionName-cache.db
	filename := filepath.Join(collection.ThumbsPath, collection.Name+"-cache.db") // Default
	if collection.DbPath != "" {
		if filepath.Dir(collection.DbPath) == "." { // It is a filename, it will be located in thumbnails directory
			filename = filepath.Join(collection.ThumbsPath, collection.DbPath)
		} else {
			filename = collection.DbPath
		}
	}

	c.store, err = bolthold.Open(filename, 0600, &bolthold.Options{Options: &bolt.Options{Timeout: 1}})
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
				tx.DeleteBucket([]byte("AlbumSaved"))
				tx.DeleteBucket([]byte("_index:Photo:Date"))
				tx.DeleteBucket([]byte("_index:Photo:HasThumb"))
				tx.DeleteBucket([]byte("_index:Photo:Location"))
				tx.DeleteBucket([]byte("_index:Photo:Size"))
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

	// Start running batchers
	c.addInfoBatcher()
	c.delInfoBatcher()

	// Ok
	return nil
}

// Release all caching resources
func (c *Cache) End() error {
	c.FinishFlush()
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

func (c *Cache) AddToListAlbums(albums ...*Album) {
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

func (c *Cache) IsAlbum(albumName string) bool {
	// Check if value is present
	_, present := c.albums.Load(albumName)
	return present
}

func (c *Cache) GetAlbum(albumName string) (*Album, error) {
	// Check if value is present
	album, err := c.mem.Get(albumName)
	if err != nil || album == nil {
		return nil, err
	}
	return album.(*Album), nil
}

func (c *Cache) SaveAlbum(album *Album) error {
	// Flag this album as loaded
	type AlbumSaved struct{}
	go c.store.Upsert(album.Name, AlbumSaved{})
	// Cache album in memory
	return c.mem.Set(album.Name, album)
}

func (c *Cache) WasAlbumSaved(album *Album) bool {
	type AlbumSaved struct{}
	var a AlbumSaved
	return c.store.Get(album.Name, &a) == nil
}

func (photo *Photo) Key() string {
	return PhotoKey(photo.Album, photo.Id)
}

func PhotoKey(album string, id string) string {
	return album + ":" + id
}

// Fill photos with info in cache (e.g. height and width)
func (c *Cache) GetPhotoInfo(album string, id string) (*Photo, error) {
	var photo Photo
	err := c.store.Get(PhotoKey(album, id), &photo)
	return &photo, err
}

func (c *Cache) addInfoBatcher() {
	c.addInfoCh = make(chan *Photo, InfoBatchSize*10)
	batches := Batch[*Photo](c.addInfoCh, InfoBatchSize)
	go func() {
		for batch := range batches {
			log.Printf("Updating cache info (%d items)", len(batch))
			c.wgFlush.Add(1)
			c.store.Bolt().Update(func(tx *bolt.Tx) error {
				// Add or update info for photos
				for _, photo := range batch {
					err := c.store.TxUpsert(tx, photo.Key(), photo)
					if err != nil {
						log.Println(err)
					}
					c.wgFlush.Done()
				}
				return nil
			})
			c.wgFlush.Done()
		}
	}()
}

func (c *Cache) delInfoBatcher() {
	c.delInfoCh = make(chan *Photo, InfoBatchSize*10)
	batches := Batch[*Photo](c.delInfoCh, InfoBatchSize)
	go func() {
		for batch := range batches {
			log.Printf("Deleting cache info (%d items)", len(batch))
			c.wgFlush.Add(1)
			c.store.Bolt().Update(func(tx *bolt.Tx) error {
				// Delete photo info
				for _, photo := range batch {
					// Delete entry
					err := c.store.TxDelete(tx, photo.Key(), photo)
					if err != nil {
						log.Println(err)
					}
					c.wgFlush.Done()
				}
				return nil
			})
			c.wgFlush.Done()
		}
	}()
}

// Flushes remaining items still in memory
func (c *Cache) FlushInfo() {
	c.addInfoCh <- nil
	c.delInfoCh <- nil
}

// Wait for all items in memory to be flushed
func (c *Cache) FinishFlush() {
	c.FlushInfo()
	c.wgFlush.Wait()
}

// Add or update info for photos
func (c *Cache) AddPhotoInfo(photos ...*Photo) {
	c.wgFlush.Add(len(photos))
	for _, photo := range photos {
		c.addInfoCh <- photo
	}
}

// Delete photo info
func (c *Cache) DeletePhotoInfo(photos ...*Photo) {
	c.wgFlush.Add(len(photos))
	for _, photo := range photos {
		c.delInfoCh <- photo
	}
}
