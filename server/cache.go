package main

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"sync"

	"github.com/bluele/gcache"
	"github.com/timshannon/bolthold"
	bolt "go.etcd.io/bbolt"
)

var dbInfo = DbInfo{
	Version: 10,
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

// Flag album as fully scanned
type AlbumSaved struct{}

// Flag album with photos missing thumbnails
type AlbumThumbs struct {
	Name string
}

// Init cache: boltdb and gcache
func (c *Cache) Init(collection *Collection, rebuildCache bool) (err error) {
	// Ensure the thumbnail folder exist
	thumbsDir := filepath.Join(collection.ThumbsPath, collection.Name+"-thumbs")
	err = os.MkdirAll(thumbsDir, os.ModePerm)
	if err != nil {
		return
	}

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
		return
	}
	// Check DB version
	var current DbInfo
	err = c.store.Get("DbInfo", &current)
	if err != nil || current.Version != dbInfo.Version {
		log.Printf("Current DB version v%d is different than required v%d\n", current.Version, dbInfo.Version)
		if rebuildCache || err == bolthold.ErrNotFound {
			log.Printf("Recreating cache DB for collection %s at %s", collection.Name, filename)
			err = c.store.Bolt().Update(func(tx *bolt.Tx) error {
				tx.DeleteBucket([]byte("DbInfo"))
				tx.DeleteBucket([]byte("Photo"))
				tx.DeleteBucket([]byte("AlbumSaved"))
				tx.DeleteBucket([]byte("ThumbQueue"))
				tx.DeleteBucket([]byte("_index:Photo:Date"))
				tx.DeleteBucket([]byte("_index:Photo:Location"))
				tx.DeleteBucket([]byte("_index:Photo:Size"))
				return c.store.TxInsert(tx, "DbInfo", dbInfo)
			})
			if err != nil {
				return
			}
		} else {
			log.Println("Run command with option -r enabled to recreate cache DB")
			return errors.New("can't use current cache DB")
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

// Cache List Albums

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
func (c *Cache) RemoveFromListAlbums(albums ...string) {
	for _, album := range albums {
		c.albums.Delete(album)
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

// Cache Albums

func (c *Cache) GetAlbum(albumName string) (*Album, error) {
	// Check if value is present
	album, err := c.mem.Get(albumName)
	if err != nil || album == nil {
		return nil, err
	}
	return album.(*Album), nil
}
func (c *Cache) SaveAlbum(album *Album) error {
	// Cache album in memory
	return c.mem.Set(album.Name, album)
}

// Album Fully Scanned

func (c *Cache) SetAlbumFullyScanned(album *Album) error {
	return c.store.Upsert(album.Name, AlbumSaved{})
}
func (c *Cache) IsAlbumFullyScanned(album *Album) bool {
	var a AlbumSaved
	return c.store.Get(album.Name, &a) == nil
}
func (c *Cache) UnsetAlbumFullyScanned(albumName string) error {
	return c.store.Delete(albumName, AlbumSaved{})
}
func (c *Cache) ResetAlbumsFullyScanned() error {
	return c.store.DeleteMatching(AlbumSaved{}, nil) // Delete all
}

// Album Thumbnail queue

func (c *Cache) SetAlbumToThumbQueue(album string) error {
	return c.store.Upsert(album, AlbumThumbs{album})
}
func (c *Cache) TxSetAlbumToThumbQueue(tx *bolt.Tx, album string) error {
	return c.store.TxUpsert(tx, album, AlbumThumbs{album})
}
func (c *Cache) UnsetAlbumFromThumbQueue(albumName string) bool {
	return c.store.Delete(albumName, AlbumThumbs{}) == nil
}
func (c *Cache) ResetAlbumsInThumbQueue() error {
	return c.store.DeleteMatching(AlbumThumbs{}, nil) // Delete all
}

// Cache data

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

					// Add album to the thumbnail queue
					if !photo.HasThumb {
						err = c.TxSetAlbumToThumbQueue(tx, photo.Album)
						if err != nil {
							log.Println(err)
						}
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
