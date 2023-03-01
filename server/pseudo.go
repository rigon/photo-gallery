package main

import (
	"errors"
	"os"
	"path"
	"strings"
)

type PseudoAlbum struct {
	Collection string `json:"collection"`
	Name       string `json:"album"`
}

func GetPseudoAlbums(collections map[string]*Collection) []PseudoAlbum {
	pseudos := make([]PseudoAlbum, 0)

	for name, collection := range collections {
		albums, _ := ListAlbums(*collection)
		for _, album := range albums {
			if album.IsPseudo {
				pseudos = append(pseudos, PseudoAlbum{Collection: name, Name: album.Name})
			}
		}
	}

	return pseudos
}

func (album Album) savePhotoToPseudoAlbum(fromCollection string, fromAlbum string, fromPhoto string, config *Collection) error {
	if !album.IsPseudo {
		return errors.New("the destination must be a pseudo album")
	}

	filename := path.Join(config.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
	file, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	defer file.Close()

	line := strings.Join([]string{fromCollection, fromAlbum, fromPhoto}, ":")
	file.WriteString(line + "\n")

	return nil
}
