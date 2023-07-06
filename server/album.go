package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"path"
	"path/filepath"
	"sort"
	"strconv"
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

func (album *Album) GetPhotos(collection *Collection) error {
	subAlbums := make(map[string]bool)
	album.photosMap = make(map[string]*Photo)

	if album.IsPseudo {
		pseudos, err := readPseudoAlbum(collection, album)
		if err != nil {
			return err
		}
		// Iterate over entries in the pseudo album
		for _, pseudo := range pseudos {
			targetCollection, err := GetCollection(pseudo.Collection)
			if err != nil {
				log.Println(err)
				continue
			}
			targetAlbum, err := targetCollection.GetAlbumWithPhotos(pseudo.Album, false)
			if err != nil {
				log.Println(err)
				continue
			}
			targetPhoto, err := targetAlbum.GetPhoto(pseudo.Photo)
			if err != nil {
				log.Println(err)
				continue
			}

			// Update photo with favorite album
			result := targetPhoto.AddFavorite(collection, album)
			if result {
				go targetCollection.cache.AddPhotoInfo(targetAlbum, targetPhoto)
			}

			photo := targetPhoto.CopyForPseudoAlbum(targetCollection, targetAlbum)
			album.photosMap[targetPhoto.Id] = photo
			subAlbums[photo.SubAlbum] = true
		}
	} else {
		// Read album (i.e. folder) contents
		log.Printf("Scanning folder for album %s[%s]...", collection.Name, album.Name)
		dir := filepath.Join(collection.PhotosPath, album.Name)
		err := filepath.WalkDir(dir, func(fileDir string, file fs.DirEntry, err error) error {
			// Iterate over folder items
			if err != nil {
				return err
			}
			if !file.IsDir() {
				removedDir := strings.TrimPrefix(fileDir, dir+string(filepath.Separator))
				fileId := strings.ToLower(strings.ReplaceAll(strings.TrimSuffix(removedDir, path.Ext(file.Name())), string(filepath.Separator), "|"))

				photo, photoExists := album.photosMap[fileId]
				if !photoExists {
					photo = new(Photo)
					photo.Id = fileId
					photo.Title = strings.TrimSuffix(file.Name(), path.Ext(file.Name()))
					photo.SubAlbum = strings.TrimSuffix(strings.TrimSuffix(removedDir, file.Name()), string(filepath.Separator))
					photo.Thumb = path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileId, "thumb")
					photo.Info = path.Join("/collection", collection.Name, "album", album.Name, "photo", fileId, "info")
					photo.Width = 200  // Default width
					photo.Height = 200 // Default height
					photo.Favorite = []PseudoAlbum{}
					album.photosMap[fileId] = photo
					// Map of sub-albums
					if photo.SubAlbum != "" {
						subAlbums[photo.SubAlbum] = true
					}
				}
				photoFile := &File{
					Path: fileDir,
					Url:  path.Join("/api/collection", collection.Name, "album", album.Name, "photo", fileId, "file", strconv.Itoa(len(photo.Files)))}

				photo.Files = append(photo.Files, photoFile)
			}
			return nil
		})
		if err != nil {
			return err
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

func (album *Album) GenerateThumbnails(collection *Collection) {
	AddWorkBackground(collection, album)
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
	type Alias Album
	alias := Alias(album)
	alias.Photos = photos
	alias.Count = len(photos)

	// Marshal the preprocessed struct to JSON
	return json.Marshal(alias)
}
