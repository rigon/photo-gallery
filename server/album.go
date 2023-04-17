package main

import (
	"errors"
	"io/ioutil"
	"path"
	"path/filepath"
	"strconv"
	"strings"
)

type Album struct {
	Name     string   `json:"name"`
	Count    int      `json:"count"`
	Date     string   `json:"title"`
	Photos   []*Photo `json:"photos"`
	IsPseudo bool     `json:"pseudo"`
}

func (album *Album) GetPhotos(collection *Collection) error {
	photos := make(map[string]*Photo)

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

			// Create a new photo
			photo := new(Photo)
			photo.Title = pseudo.Photo
			photo.Thumb = path.Join("/api/collection", pseudo.Collection, "album", pseudo.Album, "photo", pseudo.Photo, "thumb")
			photo.Height = 1
			photo.Width = 1
			for _, p := range targetAlbum.Photos {
				if p.Title == pseudo.Photo {
					photo.Files = p.Files
					break
				}
			}
			photos[pseudo.Photo] = photo
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

				photo, photoExists := photos[fileName]
				if !photoExists {
					photo = new(Photo)
					photo.Title = fileName
					photo.Thumb = path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileName, "thumb")
					photo.Height = 1
					photo.Width = 1
					photo.Favorite = false
					photos[fileName] = photo
				}
				photoFile := &File{
					Path: filepath.Join(collection.PhotosPath, album.Name, file.Name()),
					Url:  path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileName, "file", strconv.Itoa(len(photo.Files)))}

				photo.Files = append(photo.Files, photoFile)
			}
		}
	}

	album.Photos = make([]*Photo, 0, len(photos))
	for _, photo := range photos {
		album.Photos = append(album.Photos, photo)
	}

	album.Count = len(album.Photos)
	return nil
}

func (album *Album) FindPhoto(photoName string) (photo *Photo, err error) {
	for _, photo := range album.Photos {
		if photo.Title == photoName { // Found
			return photo, nil
		}
	}

	return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
}

func (album *Album) GenerateThumbnails(collection *Collection) {
	AddWorkPhotos(collection, album)
}
