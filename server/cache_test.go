package main

import (
	"fmt"
	"testing"

	"github.com/timshannon/bolthold"
)

func TestPrintPhotoInfoEntries(t *testing.T) {
	collection := Collection{
		Name:       "Photos",
		PhotosPath: "tests",
		ThumbsPath: "/tmp",
	}

	collection.cache.Init(&collection, false)
	defer collection.cache.End()

	count := 0
	collection.cache.store.ForEach(&bolthold.Query{}, func(photo *Photo) error {
		count++
		fmt.Printf("Photo #%d\n", count)
		fmt.Printf("- Title: %s\n", photo.Title)
		fmt.Printf("- Type: %s\n", photo.Type)
		fmt.Printf("- Collection: %s\n", photo.Collection)
		fmt.Printf("- Album: %s\n", photo.Album)
		fmt.Printf("- Dimension: %dx%d\n", photo.Width, photo.Height)
		fmt.Printf("- Date: %s\n", photo.Date)
		fmt.Printf("- Location: %s\n", photo.Date.Location())
		fmt.Println("- Favorite:")
		for i, fav := range photo.Favorite {
			fmt.Printf(" %4d. %s\n", i, fav)
		}
		fmt.Println("- Files:")
		for i, file := range photo.Files {
			fmt.Printf(" %4d. %s - %s: %s\n", i, file.Type, file.MIME, file.Path)
		}
		fmt.Println()
		return nil
	})
}
