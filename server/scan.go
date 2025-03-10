package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/timshannon/bolthold"
)

func (collection *Collection) Scan(fullScan bool) {
	log.Printf("Scanning collection %s...\n", collection.Name)

	albums, err := collection.LoadAlbums()
	if err != nil {
		log.Println(err)
		return
	}

	defer collection.cache.FlushInfo(true)

	// Quick scan
	if !fullScan {
		for _, album := range albums {
			// Skip albums that were saved
			_, err := album.LoadPhotos(collection, true)
			if err != nil {
				log.Println(err)
			}
		}
		return // Quick scan, stop here!
	}

	// Full scan

	collection.cache.ResetAlbumsSaved()
	collection.cache.ResetAlbumsInThumbQueue()

	for _, album := range albums {
		_, err := album.ReloadPhotos(collection, true)
		if err != nil {
			log.Println(err)
		}
	}

	// Clean entries in the cacheDB of deleted albums
	log.Printf("Cleaning entries of deleted albums in %s...\n", collection.Name)
	var photosDelete []*Photo
	albumsMap := make(map[string]struct{})
	for _, album := range albums {
		albumsMap[album.Name] = struct{}{}
	}
	err = collection.cache.store.Find(&photosDelete, bolthold.Where("Album").MatchFunc(
		func(albumName string) (bool, error) {
			_, ok := albumsMap[albumName]
			return !ok, nil
		}))
	if err == nil {
		collection.cache.DeletePhotoInfo(photosDelete...)
	} else {
		log.Println(err)
	}
}

func (collection *Collection) CreateThumbnails() {
	log.Printf("Creating thumbnails for %s...\n", collection.Name)

	// List albums with photos missing thumbnails
	var albums []*AlbumThumbs
	q := bolthold.Query{}
	err := collection.cache.store.Find(&albums, q.SortBy("Name"))
	if err != nil {
		log.Println(err)
		return
	}

	// For each album
	for _, albumThumb := range albums {
		// Get album
		album, err := collection.GetAlbumBackground(albumThumb.Name)
		if err != nil {
			log.Println(err)
			continue
		}

		// Get photos to be processed
		var photos []*Photo
		err = collection.cache.store.Find(&photos,
			bolthold.Where("Album").Eq(album.Name).Index("Album").And("HasThumb").Eq(false).SortBy("Title"))
		if err != nil {
			log.Println(err)
			continue
		}

		// Add work to generate thumbnails in background
		wg := AddThumbsBackground(collection, album, photos...)

		// Wait to complete creating thumbnails without blocking the process
		go func(collection *Collection, albumThumb *AlbumThumbs) {
			wg.Wait()
			// Update flag to indicate that the thumbnail was generated
			collection.cache.FlushInfo(false)
			// Thumbnails created, remove album from the queue
			err = collection.cache.UnsetAlbumFromThumbQueue(albumThumb.Name)
			if err != nil {
				log.Println(err)
			}
		}(collection, albumThumb)
	}
}

func (collection *Collection) CleanupThumbnails() {
	log.Printf("Cleaning up thumbnails for %s...\n", collection.Name)

	// Step 1: Create a map of files to keep
	keep := map[string]struct{}{}

	// Get path for the thumbnail for each photo
	err := collection.cache.store.ForEach(bolthold.Where("HasThumb").Eq(true), func(photo *Photo) error {
		path := photo.ThumbnailPath(collection)
		keep[path] = struct{}{}
		return nil
	})
	if err != nil {
		log.Println(err)
		return
	}

	// Step 2: Traverse the thumbnails directory

	// As defined in photo.ThumbnailPath, is exactly 12/12/123456.jpg)
	path := filepath.Join(collection.ThumbsPath, collection.Name+"-thumbs", "??", "??", "??????.jpg")
	// Gather all files from thumb folder
	folder, err := filepath.Glob(path)
	if err != nil {
		log.Println(err)
		return
	}

	// Files in ThumbsPath that match the pattern
	for _, file := range folder {
		// but does not have the corresponding photo
		if _, ok := keep[file]; !ok {
			// Delete the file
			log.Println("Deleting thumbnail", file)
			err := os.Remove(file)
			if err != nil {
				log.Println(err)
			}
		}
	}
}
