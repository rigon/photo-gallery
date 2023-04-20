package main

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type Pipi []*Photo

type Album struct {
	Name      string            `json:"name"`
	Count     int               `json:"count"`
	Date      string            `json:"title"`
	IsPseudo  bool              `json:"pseudo"`
	Photos    []*Photo          `json:"photos"` // used only when marshaling
	photosMap map[string]*Photo `json:"-"`      // actual place where photos are stored
}

func (album *Album) GetPhotos(collection *Collection) error {
	album.photosMap = make(map[string]*Photo)

	if album.IsPseudo {
		pseudos, err := readPseudoAlbum(*album, collection)
		if err != nil {
			return err
		}
		// Iterate over entries in the pseudo album
		for _, pseudo := range pseudos {
			targetCollection, err := GetCollection(pseudo.Collection)
			if err != nil {
				return err
			}
			targetAlbum, err := targetCollection.GetAlbumWithPhotos(pseudo.Album, false)
			if err != nil {
				return err
			}
			targetPhoto, err := targetAlbum.GetPhoto(pseudo.Photo)
			if err != nil {
				return err
			}

			// Create a new photo
			photo := new(Photo)
			photo.Title = pseudo.Photo
			photo.Thumb = path.Join("/api/collection", pseudo.Collection, "album", pseudo.Album, "photo", pseudo.Photo, "thumb")
			photo.Width = 200  // Default width
			photo.Height = 200 // Default height
			photo.Files = targetPhoto.Files

			album.photosMap[pseudo.Photo] = photo
		}
	} else {
		// Read album (or folder) contents
		files, err := ioutil.ReadDir(filepath.Join(collection.PhotosPath, album.Name))
		if err != nil {
			return err
		}

		// Iterate over folder items
		for _, file := range files {
			if !file.IsDir() {
				fileExt := path.Ext(file.Name())
				fileName := strings.ToLower(strings.TrimSuffix(file.Name(), fileExt))

				photo, photoExists := album.photosMap[fileName]
				if !photoExists {
					photo = new(Photo)
					photo.Title = fileName
					photo.Thumb = path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileName, "thumb")
					photo.Width = 200  // Default width
					photo.Height = 200 // Default height
					photo.Favorite = false
					album.photosMap[fileName] = photo
				}
				photoFile := &File{
					Path: filepath.Join(collection.PhotosPath, album.Name, file.Name()),
					Url:  path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileName, "file", strconv.Itoa(len(photo.Files)))}

				photo.Files = append(photo.Files, photoFile)
			}
		}
	}

	return nil
}

func (album *Album) GetPhoto(photoName string) (photo *Photo, err error) {
	photo, ok := album.photosMap[photoName]
	if !ok {
		return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
	}
	return photo, nil
}

func (album *Album) GenerateThumbnails(collection *Collection) {
	AddWorkPhotos(collection, album)
}

// Custom marshaler in order to transform photo map into a slice
func (album Album) MarshalJSON() ([]byte, error) {
	var photos []*Photo
	// Convert map to slice, strip invalid photos
	for _, photo := range album.photosMap {
		switch photo.Type {
		case "image", "video", "live":
			photos = append(photos, photo)
		}
		// Skip photos without a recognized type
	}

	// Sort photos by date (ascending), by title if not possible
	sort.Slice(photos, func(i, j int) bool {
		if photos[i].Date.IsZero() || photos[j].Date.IsZero() {
			return photos[i].Title < photos[j].Title
		}
		return photos[i].Date.Sub(photos[j].Date) < 0
	})

	// Avoid cyclic marshaling
	type Alias Album
	alias := Alias(album)
	alias.Photos = photos
	alias.Count = len(photos)

	// Marshal the preprocessed struct to JSON
	return json.Marshal(alias)
}
