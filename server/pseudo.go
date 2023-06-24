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

type PseudoAlbumSaveQuery struct {
	Collection string   `json:"collection"`
	Album      string   `json:"album"`
	Photos     []string `json:"photos"`
}

func readPseudoAlbum(collection *Collection, album *Album) ([]PseudoAlbumEntry, error) {
	if !album.IsPseudo {
		return nil, errors.New("the destination must be a pseudo album")
	}

	filename := filepath.Join(collection.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
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

func writePseudoAlbum(collection *Collection, album *Album, entries ...PseudoAlbumEntry) error {
	if !album.IsPseudo {
		return errors.New("the destination must be a pseudo album")
	}

	filename := filepath.Join(collection.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
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

func (album *Album) EditPseudoAlbum(collection *Collection, query PseudoAlbumSaveQuery, isAdd bool) error {
	entries, err := readPseudoAlbum(collection, album)
	if err != nil {
		return err
	}

	var updated []string
	for _, photo := range query.Photos {
		// Find entry already in the album
		found := -1
		for i, entry := range entries {
			if entry.Collection == query.Collection && entry.Album == query.Album && entry.Photo == photo {
				found = i
				break
			}
		}

		if isAdd {
			if found >= 0 { // Duplicated entry
				return errors.New("entry duplicated")
			}
			// Add a new entry
			entries = append(entries, PseudoAlbumEntry{Collection: query.Collection, Album: query.Album, Photo: photo})
			updated = append(updated, photo)
		} else {
			if found < 0 {
				return errors.New("entry could not be found")
			}
			// Remove the entry
			entries = append(entries[:found], entries[found+1:]...)
			updated = append(updated, photo)
		}
	}

	// Save back the pseudo album with changed entries
	err = writePseudoAlbum(collection, album, entries...)
	if err != nil {
		return err
	}

	// Update in background cached entries that were changed
	go func() error {
		fromCollection, err := GetCollection(query.Collection)
		if err != nil {
			return err
		}
		fromAlbum, err := fromCollection.GetAlbumWithPhotos(query.Album, false)
		if err != nil {
			return err
		}

		var photos []*Photo
		for _, photo := range updated {
			fromPhoto, err := fromAlbum.GetPhoto(photo)
			if err != nil {
				continue
			}

			result := false
			if isAdd { // Add link to the album
				result = fromPhoto.AddFavorite(collection, album)
			} else { // Remove link to the album
				result = fromPhoto.RemoveFavorite(collection, album)
			}
			if result {
				photos = append(photos, fromPhoto)
			}
		}

		// Update info about cached photos
		return fromCollection.cache.AddPhotoInfo(fromAlbum, photos...)
	}()

	return nil
}
