package main

import (
	"log"

	"github.com/timshannon/bolthold"
)

func (collection *Collection) QuickScan() error {
	albums, err := collection.GetAlbums()
	if err != nil {
		return err
	}
	for _, album := range albums {
		if collection.cache.WasAlbumSaved(album) {
			continue
		}
		collection.GetAlbumWithPhotos(album.Name, false)
	}
	return nil
}

func (collection *Collection) CreateThumbnails() error {
	result, err := collection.cache.store.FindAggregate(Photo{}, bolthold.Where("HasThumb").Not().Eq(true).Index("hasthumb").SortBy("Title"), "Album")
	if err != nil {
		return err
	}

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
