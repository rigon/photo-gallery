package main

import (
	"fmt"
	"hash/fnv"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCreateThumbnails(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.CreateThumbnails()
	// Wait to thumbnails to finish
	wgThumbs.Wait()
}

func TestBenchmarkThumbnails(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.cache.Init(collection, false)

	var sum time.Duration = 0
	var bytes = 0
	albums, _ := collection.GetAlbums()
	for _, album := range albums {
		album.GetPhotos(collection, false, []PseudoAlbumEntry{}...)

		start := time.Now()
		for _, photo := range album.photosMap {
			file, _ := os.ReadFile(photo.ThumbnailPath(collection))
			bytes += len(file)
		}
		sum += time.Since(start)
	}
	t.Log("Total time (ms):", sum.Milliseconds())
	t.Log("Total size (b):", bytes)
}

func TestBenchmarkThumbnailAlbum(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.cache.Init(collection, false)

	var sum time.Duration = 0
	var bytes = 0
	album, _ := collection.GetAlbum("Album 1")
	album.GetPhotos(collection, false, []PseudoAlbumEntry{}...)

	start := time.Now()
	for _, photo := range album.photosMap {
		file, _ := os.ReadFile(photo.ThumbnailPath(collection))
		bytes += len(file)
	}
	sum += time.Since(start)

	t.Log("Total time (ms):", sum.Milliseconds())
	t.Log("Total size (b):", bytes)
}

// Returns the path location for the thumbnail
func (photo *Photo) thumbnailPathOld(collection *Collection) string {
	hasher := fnv.New64a()
	hasher.Write([]byte(photo.Key()))
	hash := strconv.FormatUint(hasher.Sum64(), 36)   // Can produce hashes of up to 13 chars
	name := hash + strings.Repeat("0", 13-len(hash)) // Fill smaller hashes with "0"
	return filepath.Join(collection.ThumbsPath, collection.Name+"-thumbs", name+".jpg")
}
func TestMoveOldToNewThumbnailPath(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		ThumbsPath: "/tmp/"}

	collection.cache.Init(collection, false)
	collection.cache.store.ForEach(nil, func(photo *Photo) error {
		source := photo.thumbnailPathOld(collection)
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
