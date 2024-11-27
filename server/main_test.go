package main

import (
	"os"
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
