package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

type Photo struct {
	Thumb    string `json:"src"`
	Title    string `json:"title"`
	Type     string `json:"type"`
	Favorite bool   `json:"favorite"`
	Date     string `json:"date" boltholdIndex:"date"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Files    []File `json:"files"`
}

func (photo Photo) HashName(albumName string) string {
	hash := sha256.Sum256([]byte(albumName + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo Photo) GetThumbnail(w io.Writer, config *Collection, album *Album) error {
	// TODO: Brute-force, find a clever way to process thumbnails
	for _, file := range photo.Files {
		outputPath := filepath.Join(config.ThumbsPath, photo.HashName(album.Name)+".jpg")

		// If the file doesn't exist
		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			// Create thumbnail
			err := CreateThumbnail(file, outputPath, w)
			if err != nil {
				log.Printf("Failed to creating thumbnail for [%s] %s: %v\n", album.Name, photo.Title, err)
				return err
			}
		} else {
			data, err := ioutil.ReadFile(outputPath)
			if err != nil {
				return err
			}
			if w != nil {
				w.Write(data)
			}
		}
	}
	return nil
}

func (photo Photo) GetFile(fileNumber int) (*File, error) {
	if fileNumber < 0 || fileNumber >= len(photo.Files) {
		return nil, errors.New("invalid photo file number")
	}
	return &photo.Files[fileNumber], nil
}

func (photo *Photo) DetermineType() {
	s := len(photo.Files)
	if s == 1 {
		file := photo.Files[0]
		photo.Type = file.Type
	}
	if s > 1 {
		photo.Type = "live"
	}
}
