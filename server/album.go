package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"strings"
)

type Album struct {
	Name      string            `json:"name"`
	Count     int               `json:"count"`
	Date      string            `json:"title"`
	IsPseudo  bool              `json:"pseudo"`
	SubAlbums []string          `json:"subalbums"`
	Photos    []*Photo          `json:"photos"` // used only when marshaling
	photosMap map[string]*Photo `json:"-"`      // actual place where photos are stored
}

type PhotoFile struct {
	photoId string
	file    *File
}

func (album *Album) GetPhotos(collection *Collection, runningInBackground bool, photosToLoad ...PseudoAlbumEntry) error {
	subAlbums := make(map[string]bool)
	album.photosMap = make(map[string]*Photo)

	// Convert photosToLoad to a map for improved performance
	photosToLoadMap := make(map[string]bool)
	for _, entry := range photosToLoad {
		key := entry.Collection + ":" + entry.Album + ":" + entry.Photo
		photosToLoadMap[key] = true
	}

	if album.IsPseudo {
		// Read pseudo album
		log.Printf("Scanning pseudo-album %s[%s]...", collection.Name, album.Name)
		pseudos, err := readPseudoAlbum(collection, album)
		if err != nil {
			return err
		}

		// Get photos from pseudos
		photos := album.GetPhotosForPseudo(collection, true, runningInBackground, pseudos...)

		// Iterate over entries in the pseudo album
		for _, srcPhoto := range photos {
			photo := srcPhoto.CopyForPseudoAlbum()
			album.photosMap[photo.Id] = photo
			subAlbums[photo.SubAlbum] = true
		}
	} else {
		// Read album (i.e. folder) contents
		log.Printf("Scanning folder for album %s[%s]...", collection.Name, album.Name)
		var updatedPhotos = make(map[string]int)
		var updatedFiles []PhotoFile
		dir := filepath.Join(collection.PhotosPath, album.Name)
		err := filepath.WalkDir(dir, func(fileDir string, file fs.DirEntry, err error) error {
			// Iterate over folder items
			if err != nil {
				return err
			}
			// Skip folders
			if file.IsDir() {
				return nil
			}
			// Get parameters
			name, ext := file.Name(), filepath.Ext(file.Name())
			removedDir := strings.TrimPrefix(fileDir, dir+string(filepath.Separator))
			fileId := strings.ToLower(strings.ReplaceAll(strings.TrimSuffix(removedDir, ext), string(filepath.Separator), "|"))

			// Load only the selected photos
			if len(photosToLoad) > 0 {
				keyToFind := collection.Name + ":" + album.Name + ":" + fileId
				if _, found := photosToLoadMap[keyToFind]; !found {
					return nil // Entry not found in the map, skip
				}
			}

			photo, photoExists := album.photosMap[fileId]
			if !photoExists {
				title := strings.TrimSuffix(name, ext)
				subAlbum := strings.TrimSuffix(strings.TrimSuffix(removedDir, name), string(filepath.Separator))
				// Retrive photo info from cache if present
				photo, err = collection.cache.GetPhotoInfo(album.Name, fileId)
				if err != nil || photo == nil || photo.Id != fileId || photo.Title != title || photo.SubAlbum != subAlbum {
					// Create a new photo for photos not in cache or outdated data
					photo = &Photo{
						Id:         fileId,
						Title:      title,
						Collection: collection.Name,
						Album:      album.Name,
						SubAlbum:   subAlbum,
						Favorite:   []PseudoAlbum{},
					}
				}
				album.photosMap[fileId] = photo
				// Map of sub-albums
				if subAlbum != "" {
					subAlbums[subAlbum] = true
				}
			}

			photoFile, err := photo.GetFile(name)
			if err != nil || photoFile == nil || photoFile.Path != fileDir {
				photoFile = &File{
					Path: fileDir,
					Id:   name,
				}
				photo.Files = append(photo.Files, photoFile)
				// Add photo to the list of updated photos
				updatedPhotos[fileId]++
				updatedFiles = append(updatedFiles, PhotoFile{fileId, photoFile})
			}
			return nil
		})
		if err != nil {
			return err
		}

		// Extract missing file info
		processedFiles := AddExtractInfoWork(collection, album, runningInBackground, updatedFiles...)

		// Determine photo info after processing all files
		for photoId := range processedFiles {
			updatedPhotos[photoId]--
			if updatedPhotos[photoId] <= 0 { // Files for this photo were processed
				photo := album.photosMap[photoId]
				// Fill photo info
				photo.FillInfo()
				// Update cache
				collection.cache.AddPhotoInfo(photo)
			}
		}
		if runningInBackground {
			collection.cache.FinishFlush()
		} else {
			collection.cache.FlushInfo()
		}
	}

	// List of sub-albums
	for key := range subAlbums {
		album.SubAlbums = append(album.SubAlbums, key)
	}
	sort.Strings(album.SubAlbums)

	return nil
}

func (album *Album) GetPhoto(photoName string) (photo *Photo, err error) {
	photo, ok := album.photosMap[strings.ToLower(photoName)]
	if !ok {
		return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
	}
	return photo, nil
}

// Custom marshaler in order to transform photo map into a slice
func (album Album) MarshalJSON() ([]byte, error) {
	var photos []*Photo
	// Convert map to slice, strip invalid photos
	for _, photo := range album.photosMap {
		switch photo.Type {
		case "image", "video", "live":
			photos = append(photos, photo)
		}
		// Skip photos without a recognized type
	}

	// Sort photos by date (ascending), by title if not possible
	sort.Slice(photos, func(i, j int) bool {
		if photos[i].Date.IsZero() || photos[j].Date.IsZero() || photos[i].Date.Equal(photos[j].Date) {
			return photos[i].Title < photos[j].Title
		}
		return photos[i].Date.Sub(photos[j].Date) < 0
	})

	// Avoid cyclic marshaling
	type AlbumAlias Album
	alias := AlbumAlias(album)
	alias.Photos = photos
	alias.Count = len(photos)

	// Marshal the preprocessed struct to JSON
	return json.Marshal(alias)
}

type DuplicateFound struct {
	File       string `json:"file"`
	Collection string `json:"collection"`
	Album      string `json:"album"`
	Photo      string `json:"photo"`
}
type Duplicate struct {
	Photo *Photo           `json:"photo"`
	Found []DuplicateFound `json:"found"`
}

func (album *Album) Duplicates(collection *Collection) ([]Duplicate, error) {
	a, _ := collection.GetAlbumWithPhotos(album.Name, false, false)

	var x []Duplicate
	for _, p := range a.photosMap {
		x = append(x, Duplicate{Photo: p, Found: []DuplicateFound{{
			File:       "file",
			Collection: "collection",
			Album:      "album",
			Photo:      "photo"}}})
	}

	return x, nil

	//collection.cache

	// result, err := collection.cache.store.Find(nil, bolthold.Where("HasThumb").Not().Eq(true).Index("hasthumb").SortBy("Title"))
	// if err != nil {
	// 	return err
	// }

	// for _, albumResult := range result {
	// 	var photos []*Photo
	// 	var albumName string

	// 	// Get album
	// 	albumResult.Group(&albumName)
	// 	album, err := collection.GetAlbum(albumName)
	// 	if err != nil {
	// 		log.Println(err)
	// 		continue
	// 	}

	// 	// Get photos to be processed
	// 	albumResult.Reduction(&photos)

	// 	// Add work to generate thumbnails in background
	// 	AddThumbsBackground(collection, album, photos...)
	// }
	// return nil, nil
}
