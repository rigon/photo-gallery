package main

import (
	"errors"
	"fmt"
	"hash/fnv"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"golang.org/x/exp/slices"
)

type Photo struct {
	Id         string        `json:"id"`
	Title      string        `json:"title"`
	Type       string        `json:"type"`
	Collection string        `json:"collection"`
	Album      string        `json:"album" boltholdIndex:"Album"`
	SubAlbum   string        `json:"subalbum"`
	Favorite   []PseudoAlbum `json:"favorite"`
	Width      int           `json:"width"`
	Height     int           `json:"height"`
	Date       time.Time     `json:"date" boltholdIndex:"Date"`
	Location   GPSLocation   `json:"location"`
	Files      []*File       `json:"files"`
	HasThumb   bool          `json:"-"`                                // Indicates if the thumbnail was generated
	FileSizes  []int64       `json:"-" boltholdSliceIndex:"FileSizes"` // Photo total size, used to find duplicates
}

// Add pseudo album to the favorites list
func (photo *Photo) AddFavorite(srcCollection *Collection, srcAlbum *Album) bool {
	collection, album := srcCollection.Name, srcAlbum.Name
	// Find out if it is already in favorite list
	for _, favorite := range photo.Favorite {
		if collection == favorite.Collection && album == favorite.Album {
			return false
		}
	}
	// Is not, let's add
	photo.Favorite = append(photo.Favorite, PseudoAlbum{collection, album})
	return true
}

// Remove pseudo album from the favorite list
func (photo *Photo) RemoveFavorite(srcCollection *Collection, srcAlbum *Album) bool {
	for i, favorite := range photo.Favorite {
		// Remove it from the list if present
		if srcCollection.Name == favorite.Collection && srcAlbum.Name == favorite.Album {
			photo.Favorite = slices.Delete(photo.Favorite, i, i+1)
			return true
		}
	}
	return false
}

// Returns the path location for the thumbnail
func (photo *Photo) ThumbnailPath(collection *Collection) string {
	name := strings.Join([]string{photo.Album, photo.Id}, ":")
	hasher := fnv.New64a()
	hasher.Write([]byte(name))
	hash := strconv.FormatUint(hasher.Sum64(), 36)   // Can produce hashes of up to 13 chars
	fill := hash + strings.Repeat("0", 13-len(hash)) // Fill smaller hashes with "0"
	return filepath.Join(collection.ThumbsPath, collection.Name+"-thumbs", fill[:2], fill[2:4], fill[4:]+".jpg")
}

// Check if the photo has thumbnail generated
func (photo *Photo) ThumbnailPresent(collection *Collection) (has bool, path string) {
	path = photo.ThumbnailPath(collection)
	// If the file doesn't exist
	_, err := os.Stat(path)
	has = !os.IsNotExist(err)
	return has, path
}

// Gets a file from the photo
func (photo *Photo) GetFile(id string) (*File, error) {
	for _, file := range photo.Files {
		if file.Id == id {
			return file, nil
		}
	}
	return nil, errors.New("File not found")
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
	// Update flag to indicate that the thumbnail was generated
	defer func() {
		if !photo.HasThumb {
			photo.HasThumb = true
			collection.cache.AddPhotoInfo(photo)
		}
	}()

	hasThumb, thumbPath := photo.ThumbnailPresent(collection)
	if hasThumb {
		// Cached thumbnail
		data, err := os.ReadFile(thumbPath)
		if err != nil {
			return err
		}
		if w != nil {
			w.Write(data)
		}
	} else {
		// Select file to create the thumbnail from
		selected := photo.MainFile()
		if selected == nil {
			return errors.New("no source file to generate thumbnail from")
		}
		// Create thumbnail
		err := selected.CreateThumbnail(thumbPath, w)
		if err != nil {
			err := fmt.Errorf("failed to creating thumbnail for [%s] %s: %v", album.Name, photo.Title, err)
			log.Println(err)
			return err
		}
	}

	return nil
}

func (photo *Photo) FillInfo() error {
	var countImages = 0
	var countVideos = 0
	for _, file := range photo.Files {
		// Type
		switch file.Type {
		case "image":
			countImages++
		case "video":
			countVideos++
		}
		// File sizes
		photo.FileSizes = append(photo.FileSizes, file.Size)
	}

	// Determine photo type
	nfiles := len(photo.Files)
	switch {
	case nfiles == 1:
		file := photo.Files[0]
		photo.Type = file.Type
	case nfiles > 1:
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

	photo.Width = 200  // Default width
	photo.Height = 200 // Default height
	if selected.Width > 0 && selected.Height > 0 {
		photo.Width = selected.Width // Valid dimensions
		photo.Height = selected.Height
	}
	photo.Date = selected.Date
	photo.Location = selected.Location
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
