package main

import (
	"errors"
	"io/ioutil"
	"log"
	"path"
	"path/filepath"
	"strconv"
	"strings"
)

type Album struct {
	Name   string   `json:"name"`
	Count  int      `json:"count"`
	Date   string   `json:"title"`
	Photos []*Photo `json:"photos"`
}

func ListAlbums(config AppConfig) (albums []*Album, err error) {
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

func FindAlbum(config AppConfig, albumName string) (*Album, error) {
	albums, _ := ListAlbums(config)
	for _, elem := range albums {
		if elem.Name == albumName { // Found
			return elem, nil
		}
	}

	return nil, errors.New("album not found")
}

func GetAlbum(config AppConfig, albumName string) (album *Album, err error) {
	album, err = FindAlbum(config, albumName)
	if err != nil {
		return
	}

	album.GetPhotos(config)
	album.Count = len(album.Photos)
	return
}

func (album *Album) GetPhotos(config AppConfig) error {
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
				photo.Src = path.Join("album", album.Name, "photo", fileName, "thumb")
				photo.Height = 1
				photo.Width = 1 // + rand.Intn(2)
				photo.Type = "photo"
				photos[fileName] = photo
			}
			photoFile := File{
				Path: filepath.Join(config.PhotosPath, album.Name, file.Name()),
				Url:  path.Join("album", album.Name, "photo", fileName, "file", strconv.Itoa(len(photo.Files)))}
			photoFile.DetermineFileType()

			photo.Files = append(photo.Files, photoFile)
		}
	}

	album.Photos = make([]*Photo, 0, len(photos))
	for _, photo := range photos {
		album.Photos = append(album.Photos, photo)
	}

	return nil
}

func (album *Album) FindPhoto(photoName string) (*Photo, error) {
	album.GetPhotos(config)
	for _, photo := range album.Photos {
		if photo.Title == photoName { // Found
			return photo, nil
		}
	}

	return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
}

func (album Album) GenerateThumbnails(config AppConfig) {
	AddWork(config, album, album.Photos...)
}
