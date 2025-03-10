package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

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
	store     *bolthold.Store
	addInfoCh chan *Photo
	delInfoCh chan *Photo
	wgFlush   sync.WaitGroup
}

type StoredAlbum struct {
	Stored bool
	Album  *Album
}

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
	c.FlushInfo(true)
	return c.store.Close()
}

// List Cached Albums

func (c *Cache) LoadCachedAlbums(albums ...*Album) {
	c.ResetCachedAlbums()
	for _, album := range albums {
		c.albums.Store(album.Name, StoredAlbum{false, album})
	}
	// Load cached albums
	err := c.store.ForEach(&bolthold.Query{}, func(album *Album) error {
		if _, ok := c.albums.Load(album.Name); ok {
			c.AddToCachedAlbums(album)
		}
		return nil
	})
	if err != nil {
		log.Println(err)
	}
}
func (c *Cache) GetCachedAlbums() []*Album {
	var albums []*Album
	c.albums.Range(func(key, value any) bool {
		stored := value.(StoredAlbum)
		albums = append(albums, stored.Album)
		return true
	})
	return albums
}
func (c *Cache) GetCachedAlbum(albumName string) (album *Album, present bool) {
	entryAny, present := c.albums.Load(albumName)
	if present {
		entry := entryAny.(StoredAlbum)
		album = entry.Album
	}
	return
}
func (c *Cache) IsCachedAlbumSaved(albumName string) (saved bool) {
	entryAny, present := c.albums.Load(albumName)
	if !present {
		return false
	}
	entry := entryAny.(StoredAlbum)
	return entry.Stored
}
func (c *Cache) AddToCachedAlbums(albums ...*Album) {
	for _, album := range albums {
		c.albums.Store(album.Name, StoredAlbum{true, album})
	}
}
func (c *Cache) RemoveFromCachedAlbums(albums ...string) {
	for _, album := range albums {
		c.albums.Delete(album)
	}
}
func (c *Cache) ResetCachedAlbums() {
	c.albums.Range(func(key, value any) bool {
		c.albums.Delete(key)
		return true
	})
}

// Cache Album

func (c *Cache) GetAlbum(albumName string) (*Album, error) {
	// Check if value is present
	var album Album
	err := c.store.Get(albumName, &album)
	return &album, err
}
func (c *Cache) SaveAlbum(album *Album) error {
	c.AddToCachedAlbums(album)
	return c.store.Upsert(album.Name, album)
}
func (c *Cache) RemoveSavedAlbum(album *Album) error {
	c.RemoveFromCachedAlbums(album.Name)
	return c.store.Delete(album.Name, album)
}
func (c *Cache) ResetAlbumsSaved() error {
	c.ResetCachedAlbums()
	return c.store.DeleteMatching(Album{}, nil) // Delete all
}

// Album Thumbnail queue

func (c *Cache) SetAlbumToThumbQueue(album string) error {
	return c.store.Upsert(album, AlbumThumbs{album})
}
func (c *Cache) TxSetAlbumToThumbQueue(tx *bolt.Tx, album string) error {
	return c.store.TxUpsert(tx, album, AlbumThumbs{album})
}
func (c *Cache) UnsetAlbumFromThumbQueue(albumName string) error {
	return c.store.Delete(albumName, AlbumThumbs{})
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

// Get cached photo info
func (c *Cache) GetPhoto(album string, id string) (*Photo, error) {
	var photo Photo
	err := c.store.Get(PhotoKey(album, id), &photo)
	return &photo, err
}
func (c *Cache) GetPhotosPaged(album string, after int) ([]*Photo, error) {
	var photos []*Photo
	start := time.Now()
	err := c.store.Find(&photos, bolthold.Where("Album").Eq(album).Index("Album"). /*.Index("Date").SortBy("Date")*/ Reverse().Skip(after*50).Limit(50))
	fmt.Println("RESPONSE:", time.Since(start).String())
	return photos, err
}
func (c *Cache) GetCollectionPhotosPaged(after int) ([]*Photo, error) {
	var photos []*Photo
	q := &bolthold.Query{}
	start := time.Now()
	err := c.store.Find(&photos, q.Index("Date"). /*.SortBy("Date")*/ Reverse().Skip(after*100).Limit(100))
	fmt.Println("RESPONSE:", time.Since(start).String())
	return photos, err
}

func (c *Cache) addInfoBatcher() {
	c.addInfoCh = make(chan *Photo, InfoBatchSize*10)
	batches := Batch(c.addInfoCh, InfoBatchSize)
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
	batches := Batch(c.delInfoCh, InfoBatchSize)
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
// Set waitToFinish to true to wait for all items to be flushed
func (c *Cache) FlushInfo(waitToFinish bool) {
	c.addInfoCh <- nil
	c.delInfoCh <- nil
	if waitToFinish {
		c.wgFlush.Wait()
	}
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
