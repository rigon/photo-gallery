package main

import (
	"errors"
	"io/ioutil"
	"log"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type Album struct {
	Name   string   `json:"name"`
	Count  int      `json:"count"`
	Date   string   `json:"title"`
	Photos []*Photo `json:"photos"`
}

func ListAlbums(config Collection) (albums []*Album, err error) {
	albums = make([]*Album, 0)

	files, err := ioutil.ReadDir(config.PhotosPath)
	if err != nil {
		return
	}

	for _, file := range files {
		if file.IsDir() {
			album := new(Album)
			album.Name = file.Name()
			albums = append(albums, album)
		}
	}
	return
}

func FindAlbum(config Collection, albumName string) (*Album, error) {
	albums, _ := ListAlbums(config)
	for _, elem := range albums {
		if elem.Name == albumName { // Found
			return elem, nil
		}
	}

	return nil, errors.New("album not found")
}

func GetAlbum(config Collection, albumName string) (album *Album, err error) {
	album, err = FindAlbum(config, albumName)
	if err != nil {
		return
	}

	album.GetPhotos(config)
	album.Count = len(album.Photos)
	return
}

func (album *Album) GetPhotos(config Collection) error {
	// Read album (or folder) contents
	files, err := ioutil.ReadDir(filepath.Join(config.PhotosPath, album.Name))
	if err != nil {
		log.Fatal(err)
	}

	// Iterate over folder items
	photos := make(map[string]*Photo)
	for _, file := range files {
		if !file.IsDir() {
			fileExt := path.Ext(file.Name())
			fileName := strings.ToLower(strings.TrimSuffix(file.Name(), fileExt))

			photo, photoExists := photos[fileName]
			if !photoExists {
				photo = new(Photo)
				photo.Title = fileName
				photo.Thumb = path.Join("/collection", strconv.Itoa(config.Index), "album", album.Name, "photo", fileName, "thumb")
				photo.Height = 1
				photo.Width = 1 // + rand.Intn(2)
				photos[fileName] = photo
			}
			photoFile := File{
				Path: filepath.Join(config.PhotosPath, album.Name, file.Name()),
				Url:  path.Join("/collection", strconv.Itoa(config.Index), "album", album.Name, "photo", fileName, "file", strconv.Itoa(len(photo.Files)))}
			photoFile.DetermineType()

			photo.Files = append(photo.Files, photoFile)
		}
	}

	album.Photos = make([]*Photo, 0, len(photos))
	for _, photo := range photos {
		photo.DetermineType()
		album.Photos = append(album.Photos, photo)
	}

	// Sort photos by name (ascending)
	sort.Slice(album.Photos, func(i, j int) bool {
		return album.Photos[i].Title < album.Photos[j].Title
	})

	return nil
}

func (album *Album) FindPhoto(photoName string) (*Photo, error) {
	for _, photo := range album.Photos {
		if photo.Title == photoName { // Found
			return photo, nil
		}
	}

	return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
}

func (album Album) GenerateThumbnails(config Collection) {
	album.GetPhotos(config)
	AddWorkPhotos(config, album, album.Photos...)
}
