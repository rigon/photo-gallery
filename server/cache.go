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
func (c *Cache) Init(collection Collection) error {
	// Disk cache
	var err error
	filename := filepath.Join(collection.ThumbsPath, collection.Name+DB_NAME_SUFFIX)
	c.store, err = bolthold.Open(filename, 0600, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Check DB version
	err = c.store.Insert("DbInfo", dbInfo)
	if err == bolthold.ErrKeyExists {
		var current DbInfo
		c.store.Get("DbInfo", &current)
		if current.Version < dbInfo.Version {
			log.Printf("Warning: current DB version [v%d] is inferior than required [v%d]\n", current.Version, dbInfo.Version)
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

// // Add a list of albums to the cache database
// func (c Cache) AddAlbums(albums ...Album) error {
// 	return c.store.Bolt().Update(func(tx *bolt.Tx) error {
// 		for _, album := range albums {
// 			// Extract only info required for caching
// 			// photos := make([]string, len(album.Photos))
// 			// for _, photo := range album.Photos {
// 			// 	photos = append(photos, photo.Title)
// 			// }
// 			err := c.store.TxUpsert(tx, album.Name, album)
// 			if err != nil {
// 				return err
// 			}

// 			for _, photo := range album.Photos {
// 				err := c.store.TxUpsert(tx, photo.Title, photo)
// 				if err != nil {
// 					return err
// 				}
// 			}
// 		}
// 		return nil
// 	})
// }

// // Get album from cache
// func (c Cache) GetAlbum(albumName string) (album Album, err error) {
// 	var albums []Album
// 	err = c.store.Find(&albums, bolthold.Where(bolthold.Key).Eq(albumName))
// 	if err != nil {
// 		return album, err
// 	}
// 	if len(albums) != 1 {
// 		return album, errors.New("album not found")
// 	}
// 	return albums[0], nil
// }

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

// // Get photo from cache
// func (c Cache) GetPhoto(albumName string, photoName string) (photo Photo, err error) {
// 	var photos []Photo
// 	err = c.store.Find(&photos, bolthold.Where(bolthold.Key).Eq(photoName))
// 	if err != nil {
// 		return photo, err
// 	}
// 	if len(photos) != 1 {
// 		return photo, errors.New("photo not found")
// 	}
// 	return photos[0], nil
// }
