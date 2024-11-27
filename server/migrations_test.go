package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestMigrateThumbnailsV10(t *testing.T) {
	// Configure your collection here, for each one of them:
	collection := &Collection{
		Name:       "Photos",
		ThumbsPath: "/tmp/"}

	fmt.Println("Migrating thumbnails for:", collection)

	collection.cache.Init(collection, false)
	collection.cache.store.ForEach(nil, func(photo *Photo) error {
		// Returns the old path location of the thumbnail
		source := func(photo *Photo, collection *Collection) string {
			name := strings.Join([]string{photo.Collection, photo.Album, photo.Id}, ":")
			hash := sha256.Sum256([]byte(name))
			encoded := hex.EncodeToString(hash[:])
			return filepath.Join(collection.ThumbsPath, encoded+".jpg")
		}(photo, collection)
		// Returns the new path location of the thumbnail
		destination := photo.ThumbnailPath(collection)
		println(source, "->", destination)
		// Ensure the directories exist
		err := os.MkdirAll(filepath.Dir(destination), os.ModePerm)
		if err != nil {
			fmt.Println(err)
			return err
		}
		err = os.Rename(source, destination)
		if err != nil {
			fmt.Println(err)
		}
		return nil
	})
}
