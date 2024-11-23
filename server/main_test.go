package main

import (
	"crypto/sha256"
	"encoding/hex"
	"hash/fnv"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestCreateThumbnails(t *testing.T) {
	collection := &Collection{
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

func TestBenchmarkHashesSHA256(t *testing.T) {
	name := "somerandomname"
	start := time.Now()
	for i := 0; i < 1_000_000; i++ {
		hash := sha256.Sum256([]byte(name))
		name = hex.EncodeToString(hash[:])
	}
	t.Log("Total time (ms):", time.Since(start).Milliseconds())
}

func TestBenchmarkHashesFNV(t *testing.T) {
	name := "somerandomname"
	start := time.Now()
	for i := 0; i < 1_000_000; i++ {
		hasher := fnv.New64a()
		hasher.Write([]byte(name))
		hash := strconv.FormatUint(hasher.Sum64(), 36)  // Can produce hashes of up to 13 chars
		name = hash + strings.Repeat("0", 13-len(hash)) // Fill smaller hashes with "0"
	}
	t.Log("Total time (ms):", time.Since(start).Milliseconds())
}
