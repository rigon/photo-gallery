package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
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

func (photo *Photo) HashName(albumName string) string {
	hash := sha256.Sum256([]byte(albumName + photo.Title))
	encoded := hex.EncodeToString(hash[:])
	return encoded
}

func (photo *Photo) GetFile(fileNumber int) (*File, error) {
	if fileNumber < 0 || fileNumber >= len(photo.Files) {
		return nil, errors.New("invalid photo file number")
	}
	return &photo.Files[fileNumber], nil
}

func (photo *Photo) SelectFileForThumbnail() *File {
	size := len(photo.Files)
	switch {
	case size < 1:
		return nil
	case size == 1:
		return &photo.Files[0]
	default:
		for _, file := range photo.Files {
			if file.Type == "image" {
				return &file
			}
		}
		for _, file := range photo.Files {
			if file.Type == "video" {
				return &file
			}
		}
	}
	return nil
}

func (photo *Photo) GetThumbnailAndInfo(collection *Collection, album *Album, w io.Writer) error {
	for _, file := range photo.Files {
		file.ExtractInfo()
	}

	return photo.GetThumbnail(collection, album, w)
}

func (photo *Photo) GetThumbnail(collection *Collection, album *Album, w io.Writer) error {
	file := photo.SelectFileForThumbnail()
	if file == nil {
		return errors.New("cannot create thumbnail for photo")
	}

	outputPath := filepath.Join(collection.ThumbsPath, photo.HashName(album.Name)+".jpg")

	// If the file doesn't exist
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		// Create thumbnail
		err := file.CreateThumbnail(outputPath, w)
		if err != nil {
			return fmt.Errorf("failed to creating thumbnail for [%s] %s: %v", album.Name, photo.Title, err)
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
	return nil
}

func (photo *Photo) DetermineType() {
	size := len(photo.Files)
	if size == 1 {
		file := photo.Files[0]
		photo.Type = file.Type
	}
	if size > 1 {
		photo.Type = "live"
	}
}
