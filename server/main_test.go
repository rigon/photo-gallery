package main

import (
	"testing"
)

func TestCreateThumbnails(t *testing.T) {
	collection := &Collection{
		PhotosPath: "tests/",
		ThumbsPath: "tests/.thumbs/"}

	collection.CreateThumbnails()
	// Wait to thumbnails to finish
	wg.Wait()
}
