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

func (album *Album) GetPhotos(collection *Collection, runningInBackground bool) error {
	subAlbums := make(map[string]bool)
	album.photosMap = make(map[string]*Photo)

	if album.IsPseudo {
		// Read pseudo album
		pseudos, err := readPseudoAlbum(collection, album)
		if err != nil {
			return err
		}

		// Get photos from pseudos
		photos := GetPhotosFromPseudos(collection, album, true, pseudos...)

		// Iterate over entries in the pseudo album
		for _, srcPhoto := range photos {
			photo := srcPhoto.CopyForPseudoAlbum()
			album.photosMap[photo.Id] = photo
			subAlbums[photo.SubAlbum] = true
		}
	} else {
		// Read album (i.e. folder) contents
		log.Printf("Scanning folder for album %s[%s]...", collection.Name, album.Name)
		var updatedPhotos = make(map[string]bool)
		dir := filepath.Join(collection.PhotosPath, album.Name)
		err := filepath.WalkDir(dir, func(fileDir string, file fs.DirEntry, err error) error {
			// Iterate over folder items
			if err != nil {
				return err
			}
			if !file.IsDir() {
				name, ext := file.Name(), filepath.Ext(file.Name())
				removedDir := strings.TrimPrefix(fileDir, dir+string(filepath.Separator))
				fileId := strings.ToLower(strings.ReplaceAll(strings.TrimSuffix(removedDir, ext), string(filepath.Separator), "|"))

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
						// Add photo to the list of updated photos
						updatedPhotos[fileId] = true
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
					log.Printf("Extracting photo info [%s]: %s %s\n", album.Name, photo.Title, photo.SubAlbum)
					if runningInBackground {
						WaitBackgroundWork()
					}
					photoFile.ExtractInfo()
					photo.Files = append(photo.Files, photoFile)
					// Add photo to the list of updated photos
					updatedPhotos[fileId] = true
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
		// Determine photo info after processing all files
		for photoId := range updatedPhotos {
			photo := album.photosMap[photoId]
			photo.FillInfo()
			collection.cache.AddPhotoInfo(photo)
		}
		collection.cache.FlushInfo()
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
