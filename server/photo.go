package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Photo struct {
	Id       string      `json:"id"`
	Thumb    string      `json:"src"`
	Title    string      `json:"title"`
	Type     string      `json:"type"`
	Info     string      `json:"info"`
	SubAlbum string      `json:"subalbum"`
	Favorite []string    `json:"favorite"`
	Width    int         `json:"width"`
	Height   int         `json:"height"`
	Date     time.Time   `json:"date" boltholdIndex:"date"`
	Location GPSLocation `json:"location" boltholdIndex:"location"`
	Files    []*File     `json:"files"`
}

// Add pseudo album to the favorites list
func (photo *Photo) AddFavorite(srcCollection *Collection, srcAlbum *Album) bool {
	name := srcCollection.Name + ":" + srcAlbum.Name
	// Find out if it is already in favorite list
	for _, favorite := range photo.Favorite {
		if name == favorite {
			return false
		}
	}
	// Is not, let's add
	photo.Favorite = append(photo.Favorite, name)
	return true
}

// Remove pseudo album from the favorite list
func (photo *Photo) RemoveFavorite(srcCollection *Collection, srcAlbum *Album) bool {
	name := srcCollection.Name + ":" + srcAlbum.Name
	for i, favorite := range photo.Favorite {
		if name == favorite {
			photo.Favorite = append(photo.Favorite[:i], photo.Favorite[i+1:]...)
			return true
		}
	}
	return false
}

// Returns the path location for the thumbnail
func (photo *Photo) ThumbnailPath(collection *Collection, album *Album) string {
	name := strings.Join([]string{collection.Name, album.Name, photo.Id}, ":")
	hash := sha256.Sum256([]byte(name))
	encoded := hex.EncodeToString(hash[:])
	return filepath.Join(collection.ThumbsPath, encoded+".jpg")
}

// Gets a file from the photo
func (photo *Photo) GetFile(fileNumber int) (*File, error) {
	if fileNumber < 0 || fileNumber >= len(photo.Files) {
		return nil, errors.New("invalid photo file number")
	}
	return photo.Files[fileNumber], nil
}

// Selects a file that will represent the photo
func (photo *Photo) MainFile() *File {
	size := len(photo.Files)
	switch {
	case size < 1:
		return nil
	case size == 1:
		return photo.Files[0]
	default:
		for _, file := range photo.Files {
			if file.Type == "image" {
				return file
			}
		}
		for _, file := range photo.Files {
			if file.Type == "video" {
				return file
			}
		}
	}
	return nil
}

func (photo *Photo) GetThumbnail(collection *Collection, album *Album, w io.Writer) error {
	thumbPath := photo.ThumbnailPath(collection, album)

	// If the file doesn't exist
	if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
		// Create thumbnail
		selected := photo.MainFile()
		if selected == nil {
			return errors.New("is not a photo")
		}
		err := selected.CreateThumbnail(thumbPath, w)
		if err != nil {
			err := fmt.Errorf("failed to creating thumbnail for [%s] %s: %v", album.Name, photo.Title, err)
			log.Println(err)
			return err
		}
	} else {
		// Cached thumbnail
		data, err := ioutil.ReadFile(thumbPath)
		if err != nil {
			return err
		}
		if w != nil {
			w.Write(data)
		}
	}
	return nil
}

func (photo *Photo) FillInfo() error {
	var countImages = 0
	var countVideos = 0
	// Extract info for each file
	for _, file := range photo.Files {
		file.ExtractInfo()
		switch file.Type {
		case "image":
			countImages++
		case "video":
			countVideos++
		}
	}

	// Determine photo type
	size := len(photo.Files)
	if size == 1 {
		file := photo.Files[0]
		photo.Type = file.Type
	}
	if size > 1 {
		if countImages > 0 && countVideos > 0 {
			photo.Type = "live"
		} else {
			if countImages > 0 && countVideos == 0 {
				photo.Type = "image"
			}
			if countVideos > 0 && countImages == 0 {
				photo.Type = "video"
			}
		}
	}

	// Main file of the photo
	selected := photo.MainFile()
	if selected == nil {
		return errors.New("cannot find file")
	}

	photo.Width = selected.Width
	photo.Height = selected.Height
	photo.Date = selected.Date
	return nil
}

func (photo *Photo) GetExtendedInfo() (exs []FileExtendedInfo, err error) {
	// Extract info for each file
	for _, file := range photo.Files {
		ex, _ := file.ExtractExtendedInfo()
		exs = append(exs, ex)
	}
	return
}
