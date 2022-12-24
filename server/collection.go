package main

import (
	"fmt"
	"log"
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
