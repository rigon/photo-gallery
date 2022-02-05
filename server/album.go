package main

import (
	"errors"
	"io/ioutil"
	"log"
	"math/rand"
	"path/filepath"
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

	// Read album (or folder) contents
	files, err := ioutil.ReadDir(filepath.Join(config.PhotosPath, albumName))
	if err != nil {
		log.Fatal(err)
	}

	// Iterate over folder items
	for _, file := range files {
		if !file.IsDir() {
			photo := new(Photo)
			photo.Src = "/album/" + albumName + "/photo/" + file.Name()
			photo.Thumb = "/album/" + albumName + "/thumb/" + file.Name()
			photo.Title = file.Name()
			photo.Height = 1
			photo.Width = 1 + rand.Intn(2)
			album.Photos = append(album.Photos, photo)
		}
	}
	return
}

func (album Album) FindPhoto(photoName string) (*Photo, error) {
	for _, photo := range album.Photos {
		if photo.Title == photoName { // Found
			return photo, nil
		}
	}

	return nil, errors.New("photo not found in album")
}

func (album Album) GenerateThumbnails(config AppConfig) {
	AddWork(config, album, album.Photos...)
}
