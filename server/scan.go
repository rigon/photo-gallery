package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/timshannon/bolthold"
	"golang.org/x/exp/slices"
)

func (collection *Collection) Scan(fullScan bool) error {
	albums, err := collection.GetAlbums()
	if err != nil {
		return err
	}

	defer collection.cache.FlushInfo()

	for _, album := range albums {
		// Skip album if it was already scanned and it is a quick scan
		if !fullScan && collection.cache.WasAlbumSaved(album) {
			continue
		}

		// Load album
		album, err = collection.GetAlbumWithPhotos(album.Name, fullScan, true)
		if err != nil {
			log.Println(err)
		}

		// Skip the rest if it's a quick scan
		if !fullScan {
			continue
		}

		// Validate if photos have thumbnails
		for _, photo := range album.photosMap {
			thumbPath := photo.ThumbnailPath(collection)

			// If the file doesn't exist
			_, err := os.Stat(thumbPath)
			hasThumb := !os.IsNotExist(err)

			// Update flag if it is different than stored
			if photo.HasThumb != hasThumb {
				photo.HasThumb = hasThumb
				collection.cache.AddPhotoInfo(photo)
			}
		}

		// Validate if all entries in the cacheDB are still valid
		var photos []*Photo
		err = collection.cache.store.Find(&photos, bolthold.Where("Album").Eq(album.Name).And("Id").MatchFunc(
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
	}

	return err
}

func (collection *Collection) CreateThumbnails() error {
	result, err := collection.cache.store.FindAggregate(Photo{},
		bolthold.Where("HasThumb").Not().Eq(true).Index("hasthumb").SortBy("Title"), "Album")
	if err != nil {
		return err
	}

	defer collection.cache.FlushInfo()

	for _, albumResult := range result {
		var photos []*Photo
		var albumName string

		// Get album
		albumResult.Group(&albumName)
		album, err := collection.GetAlbum(albumName)
		if err != nil {
			log.Println(err)
			continue
		}

		// Get photos to be processed
		albumResult.Reduction(&photos)

		// Add work to generate thumbnails in background
		AddWorkBackground(collection, album, photos...)
	}
	return nil
}

func CleanupThumbnails(collections map[string]*Collection) error {
	var thumbPaths []string

	// Get thumbs paths for all collections
	for _, collection := range collections {
		// Thumbnails filenames are exactly 64 chars long followed by .jpg
		thumbPath, err := filepath.Abs(filepath.Join(collection.ThumbsPath,
			"????????????????????????????????????????????????????????????????.jpg"))
		if err != nil {
			return err
		}
		if !slices.Contains(thumbPaths, thumbPath) {
			thumbPaths = append(thumbPaths, thumbPath)
		}
	}

	// Gather all files from thumbs folders
	var files []string
	for _, thumbPath := range thumbPaths {
		folder, err := filepath.Glob(thumbPath)
		if err != nil {
			return err
		}
		files = append(files, folder...)
	}

	// Filter out files for thumbnails that are used
	for _, collection := range collections {
		var photos []*Photo
		err := collection.cache.store.Find(&photos,
			bolthold.Where("HasThumb").Eq(true).Index("hasthumb").SortBy("Title"))
		if err != nil {
			return err
		}

		for _, photo := range photos {
			thumbPath, err := filepath.Abs(photo.ThumbnailPath(collection))
			if err != nil {
				return err
			}

			index := slices.Index(files, thumbPath)
			if index >= 0 {
				files = slices.Delete(files, index, index+1)
			}
		}
	}

	// Delete remaining files
	for _, file := range files {
		log.Println("Deleting thumbnail", file)
		os.Remove(file)
	}

	return nil
}
