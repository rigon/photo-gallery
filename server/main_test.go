package main

import (
	"os"
	"testing"
	"time"
)

func TestGetAlbums(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.cache.Init(collection, false)
	defer collection.cache.End()

	albums, err := collection.GetAlbums()
	if err != nil {
		t.Fatal(err)
	}
	t.Log("-- Albums")
	for _, album := range albums {
		t.Log(album)
	}
}

func TestGetAlbum(t *testing.T) {
	collection := &Collection{
		Name:       "Photos",
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.cache.Init(collection, false)
	defer collection.cache.End()

	albums, err := collection.GetAlbums()
	if err != nil {
		t.Fatal(err)
	}

	album, err := collection.GetAlbum(albums[0].Name)
	if err != nil {
		t.Fatal(err)
	}
	photos, err := album.LoadPhotos(collection, false, false)
	if err != nil {
		t.Fatal(err)
	}
	t.Log("-- Photos")
	for _, photo := range photos {
		t.Log(photo)
	}
}

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
		photos, err := album.LoadPhotos(collection, false, false)
		if err != nil {
			t.Fatal(err)
		}

		start := time.Now()
		for _, photo := range photos {
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
	photos, err := album.LoadPhotos(collection, false, false)
	if err != nil {
		t.Fatal(err)
	}

	start := time.Now()
	for _, photo := range photos {
		file, _ := os.ReadFile(photo.ThumbnailPath(collection))
		bytes += len(file)
	}
	sum += time.Since(start)

	t.Log("Total time (ms):", sum.Milliseconds())
	t.Log("Total size (b):", bytes)
}
