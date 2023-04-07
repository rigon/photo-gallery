package main

import (
	"bufio"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"
)

const PSEUDO_ALBUM_EXT = ".PG-ALBUM"

type PseudoAlbum struct {
	Collection string `json:"collection"`
	Album      string `json:"album"`
}

// Entry in a pseudo album, in other words
// it is a reference for the photo.
type PseudoAlbumEntry struct {
	Collection string
	Album      string
	Photo      string
}

func readPseudoAlbum(album Album, config *Collection) ([]PseudoAlbumEntry, error) {
	if !album.IsPseudo {
		return nil, errors.New("the destination must be a pseudo album")
	}

	filename := filepath.Join(config.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	entries := make([]PseudoAlbumEntry, 0)
	for scanner.Scan() {
		line := scanner.Text()
		split := strings.Split(line, ":")
		if len(split) != 3 {
			log.Println("The following line is not formatted correctly:", line)
			break
		}
		// Decompose slice
		collection, album, photo := split[0], split[1], strings.ToLower(split[2])
		entries = append(entries, PseudoAlbumEntry{Collection: collection, Album: album, Photo: photo})
	}

	return entries, nil
}

func writePseudoAlbum(entries []PseudoAlbumEntry, album Album, config *Collection) error {
	if !album.IsPseudo {
		return errors.New("the destination must be a pseudo album")
	}

	filename := filepath.Join(config.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
	file, err := os.OpenFile(filename, os.O_TRUNC|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	for _, entry := range entries {
		line := strings.Join([]string{entry.Collection, entry.Album, entry.Photo}, ":")
		file.WriteString(line + "\n")
	}

	return nil
}

func GetPseudoAlbums(collections map[string]*Collection) []PseudoAlbum {
	pseudos := make([]PseudoAlbum, 0)

	for name, collection := range collections {
		albums, _ := collection.GetAlbums()
		for _, album := range albums {
			if album.IsPseudo {
				pseudos = append(pseudos, PseudoAlbum{Collection: name, Album: album.Name})
			}
		}
	}

	return pseudos
}

func (album Album) SavePhotoToPseudoAlbum(fromCollection string, fromAlbum string, fromPhoto string, config *Collection) error {
	entries, err := readPseudoAlbum(album, config)
	if err != nil {
		return err
	}

	// Check for duplicate entries
	for _, entry := range entries {
		if entry.Collection == fromCollection && entry.Album == fromAlbum && entry.Photo == fromPhoto {
			return nil
		}
	}

	// Add a new entry
	entries = append(entries, PseudoAlbumEntry{Collection: fromCollection, Album: fromAlbum, Photo: fromPhoto})
	// Save to file
	writePseudoAlbum(entries, album, config)

	return nil
}

func (album Album) RemovePhotoFromPseudoAlbum(fromCollection string, fromAlbum string, fromPhoto string, config *Collection) error {
	entries, err := readPseudoAlbum(album, config)
	if err != nil {
		return err
	}

	// Find entry
	for i, entry := range entries {
		if entry.Collection == fromCollection && entry.Album == fromAlbum && entry.Photo == fromPhoto {
			entries = append(entries[:i], entries[i+1:]...)
			err := writePseudoAlbum(entries, album, config)
			if err != nil {
				return err
			}
			return nil
		}
	}

	return errors.New("entry could not be found")
}
