package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path"
)

type Collection struct {
	Index           int
	Name            string
	PhotosPath      string
	ThumbsPath      string
	Hide            bool
	ReadOnly        bool
	RenameOnReplace bool
	loadedAlbum     *Album
}

type AddAlbumQuery struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func (c Collection) String() string {
	return fmt.Sprintf("%s (%s)", c.Name, c.PhotosPath)
}

func GetCollections(collections map[string]*Collection) []string {
	names := make([]string, len(app.Collections))

	for _, c := range app.Collections {
		if !c.Hide {
			names[c.Index] = c.Name
		}
	}

	return names
}

func GetCollection(collection string) *Collection {
	val, present := app.Collections[collection]
	if !present {
		log.Println("invalid collection")
	}
	return val
}

func (c Collection) AddAlbum(info AddAlbumQuery) error {
	name := info.Name
	if info.Type == "pseudo" {
		name += PSEUDO_ALBUM_EXT
	}
	p := path.Join(c.PhotosPath, name)

	// File or folder already exists, cannot overwrite
	if _, err := os.Stat(p); !errors.Is(err, os.ErrNotExist) {
		return err
	}

	switch info.Type {
	case "regular":
		// Create folder
		os.Mkdir(p, os.ModeDir)
	case "pseudo":
		file, err := os.Create(p)
		if err != nil {
			log.Fatal(err)
		}
		// Just touching the file
		file.Close()
	default:
		return errors.New("Invalid album type " + info.Type)
	}
	return nil
}
