package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"os"
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

type AlbumMoveQuery struct {
	Collection string   `json:"collection"` // target collection
	Album      string   `json:"album"`      // target album
	Photos     []string `json:"photos"`     // list of photo names to move
	Mode       string   `json:"mode"`       // move mode: cancel, skip, rename
}

type AlbumDeleteQuery struct {
	Photos []string `json:"photos"` // list of photo names to delete
}

type PhotoFile struct {
	photoId string
	file    *File
}

func (album *Album) GetPhotos(collection *Collection, runningInBackground bool, photosToLoad ...PseudoAlbumEntry) error {
	subAlbums := make(map[string]bool)
	album.photosMap = make(map[string]*Photo)

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
				found := false
				for _, entry := range photosToLoad {
					if entry.Collection == collection.Name && entry.Album == album.Name && entry.Photo == fileId {
						found = true
						break
					}
				}
				if !found { // if not in the list, skip
					return nil
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

func (srcAlbum *Album) MovePhotos(mode string, srcCollection *Collection, dstCollection *Collection, dstAlbum *Album, photoNames ...string) (map[string]int, error) {
	var photos []*Photo
	photosMoved := make([]*Photo, 0)

	// Update info of moved photos
	defer dstCollection.cache.AddPhotoInfo(photosMoved...)

	// Gather all photos to move
	for _, photoName := range photoNames {
		photo, err := srcAlbum.GetPhoto(photoName)
		if err != nil {
			return nil, err
		}
		photos = append(photos, photo)
	}

	// Determine the action when files already exist in the destination
	// - cancel: do nothing
	// - skip: skip files with conflicting names
	// - rename: rename the file by adding a sequence number
	var skip = make([]bool, len(photos))
	var rename = make([]int, len(photos))
	for i, photo := range photos {
		renameSeq := 1

		for loop := true; loop; {
			loop = false
			// Check if any of the files exists in the destination
			exists := false
			for _, file := range photo.Files {
				dstPath := filepath.Join(dstCollection.PhotosPath, dstAlbum.Name, RenameFilename(file.Name(), renameSeq))
				if _, err := os.Stat(dstPath); err == nil {
					exists = true
					break
				}
				// Check if not conflicting with any of the renamed files
				for j := 0; j < i; j++ {
					for _, previousFile := range photo.Files {
						previousFilePath := filepath.Join(dstCollection.PhotosPath, dstAlbum.Name, RenameFilename(previousFile.Name(), rename[j]))
						if dstPath == previousFilePath {
							exists = true
							break
						}
					}
				}
			}

			if exists {
				switch mode {
				case "cancel":
					return nil, errors.New("the destination file already exists")
				case "skip":
					skip[i] = true
				case "rename":
					loop = true
					renameSeq++
				}
			}
		}

		rename[i] = renameSeq
	}

	// Perform the actual move
	countMovedPhotos := 0
	countMovedFiles := 0
	countSkippedPhotos := 0
	countRenamedPhotos := 0
	for i, photo := range photos {
		if skip[i] {
			countSkippedPhotos++
			continue
		}

		// Move photo info
		srcCollection.cache.DeletePhotoInfo(photo)
		// TODO: update Collection and Album of the photo
		// TODO: update favorites

		// files path are updated later bellow
		photosMoved = append(photosMoved, photo)

		// Move thumbnail
		srcThumbPath := photo.ThumbnailPath(srcCollection)
		dstThumbPath := photo.ThumbnailPath(dstCollection)
		err := os.Rename(srcThumbPath, dstThumbPath)
		if err != nil { // If not possible to rename, remove thumbnail for cleanup
			os.Remove(srcThumbPath)
		}

		// Move files
		for _, file := range photo.Files {
			// Double check if we are not replacing files
			dstPath := filepath.Join(dstCollection.PhotosPath, dstAlbum.Name, RenameFilename(file.Name(), rename[i]))
			if _, err := os.Stat(dstPath); os.IsNotExist(err) {
				// Move the file to the new location with the new name
				err := os.Rename(file.Path, dstPath)
				if err != nil {
					return nil, err
				}
			} else {
				return nil, errors.New("the destination file already exists")
			}

			// Update path of the file
			file.Path = dstPath

			countMovedFiles++
		}
		countMovedPhotos++
		if rename[i] > 1 {
			countRenamedPhotos++
		}
	}
	return map[string]int{
		"moved_photos": countMovedPhotos,
		"moved_files":  countMovedFiles,
		"skipped":      countSkippedPhotos,
		"renamed":      countRenamedPhotos,
	}, nil
}

func (album *Album) DeletePhotos(collection *Collection, photoNames ...string) error {
	for _, photoName := range photoNames {
		photo, err := album.GetPhoto(photoName)
		if err != nil {
			return err
		}

		// Remove info
		collection.cache.DeletePhotoInfo(photo)

		// Remove thumbnail
		thumbPath := photo.ThumbnailPath(collection)
		os.Remove(thumbPath)

		// Remove files
		for _, file := range photo.Files {
			err := os.Remove(file.Path)
			if err != nil {
				return err
			}
		}
	}
	return nil
}
