package main

import (
	"os"
	"testing"
)

func TestDecodeEncodeImage(t *testing.T) {
	img, err := DecodeImage("tests/album1/image3.heic")
	if err != nil {
		t.Errorf("Failed decode image: %s\n", err)
		return
	}

	fo, err := os.OpenFile("tests/.thumbs/out.jpg", os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		t.Errorf("Failed to create output file: %s\n", err)
		return
	}
	defer fo.Close()

	err = EncodeImage(fo, img, nil)
	if err != nil {
		t.Errorf("Failed to encode: %s\n", err)
		return
	}
}
