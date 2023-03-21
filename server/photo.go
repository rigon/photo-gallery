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
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	Files    []File `json:"files"`
}

func (photo Photo) HashName(album Album) string {
	hash := sha256.Sum256([]byte(album.Name + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo Photo) GetThumbnail(w io.Writer, config Collection, album Album) error {
	// TODO: Brute-force, find a clever way to process thumbnails
	for _, file := range photo.Files {
		outputPath := filepath.Join(config.ThumbsPath, photo.HashName(album)+".jpg")

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

func (photo Photo) GetImage(fileNumber int, w io.Writer) error {
	if fileNumber < 0 || fileNumber >= len(photo.Files) {
		return errors.New("invalid photo file number")
	}
	file := photo.Files[fileNumber]

	// If the file requires transcoding
	if file.Type == "image" && file.Ext == ".heic" {
		// Decode original image
		img, exif, err := DecodeImage(file.Path)
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

	// Open input file
	fin, err := os.Open(file.Path)
	if err != nil {
		return err
	}
	defer fin.Close()
	// create buffer
	b := make([]byte, 4096)
	for {
		// read content to buffer
		readTotal, err := fin.Read(b)
		if err != nil {
			if err != io.EOF {
				return err
			}
			break
		}
		w.Write(b[:readTotal]) // print content from buffer
	}
	return nil
}

func (photo *Photo) DetermineType() {
	s := len(photo.Files)
	if s == 1 {
		photo.Type = photo.Files[0].Type
	}
	if s > 1 {
		photo.Type = "live"
	}
}
