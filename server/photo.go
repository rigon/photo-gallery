package main

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

type Photo struct {
	Src       string   `json:"src"`
	Title     string   `json:"title"`
	Width     int      `default:"1" json:"width"`
	Height    int      `default:"1" json:"height"`
	Files     []string `json:"files"`
	Filenames []string `json:"-"`
}

func (photo Photo) HashName(album Album) string {
	hash := sha256.Sum256([]byte(album.Name + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo Photo) GetThumbnail(w io.Writer, config AppConfig, album Album) error {
	// TODO: Brute-force, find a clever way to process thumbnails
	for _, filename := range photo.Filenames {
		srcimg := filepath.Join(config.PhotosPath, album.Name, filename)
		path := filepath.Join(config.ThumbsPath, photo.HashName(album)+".jpg")

		// If the file doesn't exist
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// Create thumbnail
			err := CreateThumbnail(srcimg, path, w)
			if err != nil {
				log.Printf("Failed to creating thumbnail for [%s] %s: %v\n", album.Name, photo.Title, err)
				return err
			}
		} else {
			data, err := ioutil.ReadFile(path)
			if err != nil {
				return err
			}
			w.Write(data)
		}
	}
	return nil
}

func (photo Photo) GetImage(w io.Writer, config AppConfig, album Album, fileNumber int) error {
	path := filepath.Join(config.PhotosPath, album.Name, photo.Filenames[fileNumber])

	// Decode original image
	img, exif, err := DecodeImage(path)
	if err != nil {
		return err
	}

	// Encode thumbnail
	err = EncodeImage(w, img, exif)
	if err != nil {
		return err
	}
	return nil
}
