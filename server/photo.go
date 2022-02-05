package main

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"os"
	"path/filepath"
)

type Photo struct {
	Src    string `json:"src"`
	Thumb  string `json:"thumb"`
	Title  string `json:"title"`
	Width  int    `default:"1" json:"width"`
	Height int    `default:"1" json:"height"`
}

func (photo Photo) HashName(album Album) string {
	hash := sha256.Sum256([]byte(album.Name + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo Photo) GetThumbnail(w io.Writer, config AppConfig, album Album) error {
	path := filepath.Join(config.ThumbsPath, photo.HashName(album)+".jpg")

	// If the file doesn't exist
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// Create thumbnail
		err := CreateThumbnail(filepath.Join(config.PhotosPath, album.Name, photo.Title), path)
		if err != nil {
			log.Printf("Failed to creating thumbnail for [%s] %s: %v\n", album.Name, photo.Title, err)
			return err
		}
	}
	return nil
}

func (photo Photo) GetImage(w io.Writer, config AppConfig, album Album) error {
	path := filepath.Join(config.ThumbsPath, album.Name, photo.Title)

	// Decode original image
	img, exif, err := DecodeImage(path)

	// Encode thumbnail
	err = EncodeImage(w, img, exif)
	if err != nil {
		return err
	}
	return nil
}
