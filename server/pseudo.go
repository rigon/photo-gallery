package main

import (
	"bufio"
	"errors"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"golang.org/x/exp/slices"
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

// Create a new copy photo to use in pseudo albums
func (photo *Photo) CopyForPseudoAlbum() *Photo {
	return &Photo{
		// Changed fields
		SubAlbum: photo.Album,
		// Copy the remainder
		Id:         photo.Id,
		Title:      photo.Title,
		Type:       photo.Type,
		Collection: photo.Collection,
		Album:      photo.Album,
		Width:      photo.Width,
		Height:     photo.Height,
		Date:       photo.Date,
		Location:   photo.Location,
		Favorite:   photo.Favorite,
		Files:      photo.Files,
	}
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
		// Skip empty lines and comments
		if len(line) == 0 || strings.HasPrefix(line, "#") {
			continue
		}
		// Split line into fields
		split := strings.Split(line, ":")
		if len(split) != 3 {
			log.Println("Line is not formatted correctly:", line)
			continue
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

// If the album is a pseudo album, it will resolve the reference to the source photos
func resolveQueryPhotos(query PseudoAlbumSaveQuery) (list []PseudoAlbumEntry, err error) {
	collection, err := GetCollection(query.Collection)
	if err != nil {
		return nil, err
	}

	album, err := collection.GetAlbum(query.Album)
	if err != nil {
		return nil, err
	}

	// If it is a pseudo album, we need to resolve the links to the photos
	if album.IsPseudo {
		entries, err := readPseudoAlbum(collection, album)
		if err != nil {
			return nil, err
		}
		for _, photo := range query.Photos {
			for _, entry := range entries {
				if entry.Photo == photo {
					list = append(list, entry)
					break
				}
			}
		}
	} else {
		// If not, just convert the list of photos to PseudoAlbumEntry
		for _, photo := range query.Photos {
			list = append(list, PseudoAlbumEntry{Collection: query.Collection, Album: query.Album, Photo: photo})
		}
	}

	return
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
	// Read entries from target album
	entries, err := readPseudoAlbum(collection, album)
	if err != nil {
		return err
	}

	// Resolve links for pseudo albums
	editPhotos, err := resolveQueryPhotos(query)
	if err != nil {
		return err
	}

	var updated []PseudoAlbumEntry
	errs := make([]string, 0)
	for _, edit := range editPhotos {
		// Find entry already in the album
		found := -1
		for i, entry := range entries {
			if entry.Collection == edit.Collection && entry.Album == edit.Album && entry.Photo == edit.Photo {
				found = i
				break
			}
		}

		if isAdd {
			if found < 0 {
				// Add a new entry
				entries = append(entries, edit)
			} else {
				errs = append(errs, "entry duplicated: "+edit.Photo)
			}
		} else {
			if found >= 0 {
				// Remove the entry
				entries = slices.Delete(entries, found, found+1)
			} else {
				errs = append(errs, "entry could not be found: "+edit.Photo)
			}
		}

		// Add photo to the list of updated photos
		updated = append(updated, edit)
	}

	// Save back the pseudo album with changed entries
	err = writePseudoAlbum(collection, album, entries...)
	if err != nil {
		return err
	}

	// Update in background cached entries that were changed
	go GetPhotosFromPseudos(isAdd, false, collection, album, updated...)

	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "\n"))
	}
	return nil
}

func GetPhotosFromPseudos(isAdd bool, runningInBackground bool, collection *Collection, album *Album, entries ...PseudoAlbumEntry) []*Photo {
	var photos []*Photo

	// Sort pseudo entries by collection and album
	// it will allow loading them only once
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Collection == entries[j].Collection {
			return entries[i].Album < entries[j].Album
		}
		return entries[i].Collection < entries[j].Collection
	})

	var srcCollection *Collection
	var srcAlbum *Album
	var err error
	for _, entry := range entries {
		forceAlbumLoad := false
		// Load collection
		if srcCollection == nil || srcCollection.Name != entry.Collection {
			// Flush previous collection
			if srcCollection != nil {
				srcCollection.cache.FlushInfo()
			}
			srcCollection, err = GetCollection(entry.Collection)
			if err != nil {
				log.Println(err)
				continue
			}
			forceAlbumLoad = true
		}

		// Load album
		if forceAlbumLoad || srcAlbum == nil || srcAlbum.Name != entry.Album {
			srcAlbum, err = collection.GetAlbumWithPhotos(entry.Album, false, runningInBackground)
			if err != nil {
				log.Println(err)
				continue
			}
		}

		// Load photo
		photo, err := srcAlbum.GetPhoto(entry.Photo)
		if err != nil {
			continue
		}

		result := false
		if isAdd { // Add link to the album
			result = photo.AddFavorite(collection, album)
		} else { // Remove link to the album
			result = photo.RemoveFavorite(collection, album)
		}
		// Update info about cached photos if there is a change
		if result {
			collection.cache.AddPhotoInfo(photo)
		}

		photos = append(photos, photo)
	}

	// Flush previous collection
	if srcCollection != nil {
		srcCollection.cache.FlushInfo()
	}

	return photos
}
