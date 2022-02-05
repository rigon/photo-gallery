package main

import (
	"os"
	"testing"
)

func TestCreateThumbnails(t *testing.T) {
	config = AppConfig{
		PhotosPath: "tests/collection/",
		ThumbsPath: "tests/thumbs/"}

	CreateThumbnails(config)
	wg.Wait()
}

func TestDecodeEncodeImage(t *testing.T) {
	file, err := os.Open("tests/collection/album1/demo1.heic")
	if err != nil {
		t.Errorf("Failed to open file: %s\n", err)
	}
	defer file.Close()

	img, exif, err := DecodeImage(file)
	if err != nil {
		t.Errorf("Failed decode image: %s\n", err)
	}

	fo, err := os.OpenFile("tests/thumbs/out.jpg", os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		t.Errorf("Failed to create output file: %s\n", err)
	}
	defer fo.Close()

	err = EncodeImage(fo, img, exif)
	if err != nil {
		t.Errorf("Failed to encode: %s\n", err)
	}
}
