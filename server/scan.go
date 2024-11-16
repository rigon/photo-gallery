package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/timshannon/bolthold"
)

func (collection *Collection) Scan(fullScan bool) {
	albums, err := collection.GetAlbums()
	if err != nil {
		log.Println(err)
		return
	}

	defer collection.cache.FinishFlush()

	// Quick scan
	if !fullScan {
		for _, album := range albums {
			if !collection.cache.IsAlbumFullyScanned(album) { // Skip album if it was already scanned
				collection.GetAlbumWithPhotos(album.Name, true, true)
			}
		}
		return
	}

	// Full scan
	for _, album := range albums {
		// Load album
		album, err = collection.GetAlbumWithPhotos(album.Name, true, true)
		if err != nil {
			log.Println(err)
		}

		// Validate if photos have thumbnails
		for _, photo := range album.photosMap {
			hasThumb, _ := photo.ThumbnailPresent(collection)

			// Update flag if it is different than stored
			if photo.HasThumb != hasThumb {
				photo.HasThumb = hasThumb
				collection.cache.AddPhotoInfo(photo)
			}
		}

		// Validate if all entries in the cacheDB are still valid
		var photos []*Photo
		err = collection.cache.store.Find(&photos, bolthold.Where("Album").Eq(album.Name).Index("Album").And("Id").MatchFunc(
			func(id string) (bool, error) {
				p, e := album.GetPhoto(id)
				if e == nil && p != nil {
					return false, nil
				}
				return true, nil
			}))
		if err == nil {
			collection.cache.DeletePhotoInfo(photos...)
		}
	}

	// Clean entries in the cacheDB of deleted albums
	var photos []*Photo
	err = collection.cache.store.Find(&photos, bolthold.Where("Album").MatchFunc(
		func(album string) (bool, error) {
			return !collection.cache.IsAlbum(album), nil
		}))
	if err == nil {
		collection.cache.DeletePhotoInfo(photos...)
	} else {
		log.Println(err)
	}
}

func (collection *Collection) CreateThumbnails() {
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
		album, err := collection.GetAlbum(albumThumb.Name)
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
		AddThumbsBackground(collection, album, photos...)

		// Thumbnails created, remove album from the queue
		err = collection.cache.store.Delete(albumThumb.Name, albumThumb)
		if err != nil {
			log.Println(err)
		}
	}
}

func CleanupThumbnails(collections map[string]*Collection) {
	keep := map[string]struct{}{}

	// Step 1: Create a map of files to keep
	for _, collection := range collections {
		// Get all photos with thumbnail
		var photos []*Photo
		err := collection.cache.store.Find(&photos, bolthold.Where("HasThumb").Eq(true))
		if err != nil {
			log.Println(err)
			return
		}

		// Get path for the thumbnail for each photo
		for _, photo := range photos {
			path := photo.ThumbnailPath(collection)
			keep[path] = struct{}{}
		}
	}

	// Step 2: Traverse the thumbnails directory for each collection
	for _, collection := range collections {
		// As defined in photo.ThumbnailPath, is exactly "d1/d2/1234567.jpg"
		path := filepath.Join(collection.ThumbsPath, "??", "??", "???????.jpg")
		// Gather all files from thumbs folders
		folder, err := filepath.Glob(path)
		if err != nil {
			log.Println(err)
			continue
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
}
