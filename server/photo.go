package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
)

type Photo struct {
	Thumb  string `json:"thumbnail"`
	Title  string `json:"title"`
	Type   string `json:"type"`
	Width  int    `default:"1" json:"width"`
	Height int    `default:"1" json:"height"`
	Files  []File `json:"files"`
}

func (photo Photo) HashName(album Album) string {
	hash := sha256.Sum256([]byte(album.Name + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo Photo) GetThumbnail(w io.Writer, config AppConfig, album Album) error {
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
			w.Write(data)
		}
	}
	return nil
}

func (photo Photo) GetImage(fileNumber int, w io.Writer) error {
	fmt.Println("GetImage")

	file := photo.Files[fileNumber]

	// If the file requires transcoding
	if file.Type == "image" && file.Ext == ".heic" {
		fmt.Println("DecodeImage")
		// Decode original image
		img, exif, err := DecodeImage(file.Path)
		if err != nil {
			return err
		}

		fmt.Println("EncodeImage")
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
		return nil
	}
	defer fin.Close()
	// create buffer
	b := make([]byte, 4096)
	for {
		// read content to buffer
		readTotal, err := fin.Read(b)
		fmt.Println(readTotal)
		if err != nil {
			if err != io.EOF {
				fmt.Println(err)
			}
			break
		}
		w.Write(b[:readTotal]) // print content from buffer
	}
	return nil
}

func (photo *Photo) DetermineType() {
	isVideo := true
	for _, file := range photo.Files {
		if file.Type == "image" {
			isVideo = false
		}
	}
	if isVideo {
		photo.Type = "video"
	} else {
		photo.Type = "photo"
	}
}
