package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"golang.org/x/exp/maps"

	"github.com/hlubek/readercomp"
	"github.com/timshannon/bolthold"
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
				photo.FillInfo(collection)
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

type DuplicateFile struct {
	From int `json:"from"`
	To   int `json:"to"`
}

type DuplicateFound struct {
	Photo      *Photo          `json:"photo"`
	Files      []DuplicateFile `json:"files"`
	Equal      bool            `json:"equal"`      // All files were matched
	Partial    bool            `json:"partial"`    // Only some files were matched
	Incomplete bool            `json:"incomplete"` // Found photos with more files
	Conflict   bool            `json:"conflict"`   // Combination of Partial and Incomplete
	SameAlbum  bool            `json:"samealbum"`  // Photos are in the same album
}
type Duplicate struct {
	Photo *Photo           `json:"photo"`
	Found []DuplicateFound `json:"found"`
}

const FILE_NOT_FOUND = -1

func (album *Album) Duplicates() (map[string]interface{}, error) {
	var dups = make(map[string][]DuplicateFound)

	// Collect all file sizes from the album we want to analyze
	var sizes []interface{}
	for _, photo := range album.photosMap {
		for _, size := range photo.FileSizes {
			sizes = append(sizes, size)
		}
	}

	// Iterate through collections (seaching and comparing))
	for _, collection := range config.collections {
		fmt.Println("#################", collection.Name)
		i := 0
		total := time.Now()

		var dbPhotosList []*Photo
		start := time.Now()
		// Search for all files in the collection that have the same size
		err := collection.cache.store.Find(&dbPhotosList, bolthold.Where("FileSizes").In(sizes...).Index("FileSizes"))
		fmt.Println("SEARCHING:", time.Since(start).String())
		if err != nil {
			fmt.Println(err)
			continue
		}

		// Maps sizes to the corresponding photo
		dbPhotosMap := make(map[int64][]*Photo)
		for _, dbPhoto := range dbPhotosList {
			for _, size := range dbPhoto.FileSizes {
				dbPhotosMap[size] = append(dbPhotosMap[size], dbPhoto)
			}
		}

		// For every photo in the album
		for _, photo := range album.photosMap {
			// Select only matching photos from the search results
			dbPhotos := make(map[string]*Photo)
			for _, file := range photo.Files {
				for _, dbPhoto := range dbPhotosMap[file.Size] {
					// Same photo, skip
					if dbPhoto.Collection == photo.Collection && dbPhoto.Album == photo.Album && dbPhoto.Id == photo.Id {
						continue
					}
					dbPhotos[dbPhoto.Key()] = dbPhoto
				}
			}

			var visited = make(map[string]bool) // Photos visited from search results
			var compareTime = time.Now()
			for _, dbPhoto := range dbPhotos {
				// Avoid comparing the same photos more than once
				if _, ok := visited[dbPhoto.Key()]; ok {
					continue
				}
				visited[dbPhoto.Key()] = true

				var matchAny = false
				var allFilesDb = true
				var files []DuplicateFile
				var matchFiles = make(map[string]bool) // Files found from the photo were are analyzing
				for dbFileNr, dbFile := range dbPhoto.Files {
					var fileNotFound = true
					for fileNr, file := range photo.Files {
						if dbFile.Size == file.Size {
							equal, err := readercomp.FilesEqual(file.Path, dbFile.Path)
							if err != nil {
								continue
							}
							if equal {
								matchAny = true
								fileNotFound = false
								matchFiles[file.Id] = true
								files = append(files, DuplicateFile{From: fileNr, To: dbFileNr})
							} else {
								log.Printf("Missed file comparison:\n- Source: %s\n- Target: %s\n", file.Path, dbFile.Path)
							}
						}
					}
					if fileNotFound {
						allFilesDb = false
						files = append(files, DuplicateFile{From: FILE_NOT_FOUND, To: dbFileNr})
					}
				}

				// Any file found?
				if matchAny {
					// Files that were not matched with from file from the search
					var allFiles = true
					for fileNr, file := range photo.Files {
						if _, ok := matchFiles[file.Id]; !ok {
							allFiles = false
							files = append(files, DuplicateFile{From: fileNr, To: FILE_NOT_FOUND})
						}
					}

					// Add to the list of found photos, determine status of the duplicate
					dups[photo.Id] = append(dups[photo.Id], DuplicateFound{
						Photo:      dbPhoto,
						Files:      files,
						Equal:      allFiles && allFilesDb,
						Incomplete: allFiles && !allFilesDb,
						Partial:    !allFiles && allFilesDb,
						Conflict:   !allFiles && !allFilesDb,
						SameAlbum:  dbPhoto.Collection == photo.Collection && dbPhoto.Album == photo.Album,
					})
				}
			}

			i++
			fmt.Printf("COMPARING (%d/%d) %7s %s\n", i, len(album.photosMap), time.Since(compareTime).Round(time.Millisecond).String(), photo.Id)
		}
		fmt.Println("TOTAL:", time.Since(total).String())
	}

	var listUnique []*Photo
	var listKeep []Duplicate
	var listDelete []Duplicate
	var listConflict []Duplicate
	var listSameAlbum []Duplicate
	var listAlbums = make(map[string]PseudoAlbum)
	for key, photo := range album.photosMap {
		if found, ok := dups[key]; ok {

			var unique, keep, delete, conflict, sameAlbum = true, false, false, false, false
			for _, entry := range found {
				// Keep track of albums where photos were found
				keyAlbum := entry.Photo.Collection + ":" + entry.Photo.Album
				if _, ok := listAlbums[keyAlbum]; !ok {
					listAlbums[keyAlbum] = PseudoAlbum{entry.Photo.Collection, entry.Photo.Album}
				}

				// Dertermine best action to apply
				switch {
				// Delete
				case !entry.SameAlbum && (entry.Equal || entry.Incomplete):
					unique, keep, delete, conflict, sameAlbum = false, false, true, false, false
				// Same album
				case !delete && entry.SameAlbum:
					unique, keep, delete, conflict, sameAlbum = false, false, false, false, true
				// Keep
				case !delete && !sameAlbum && entry.Partial:
					unique, keep, delete, conflict, sameAlbum = false, true, false, false, false
				// Conflict
				case !delete && !sameAlbum && !keep && entry.Conflict:
					unique, keep, delete, conflict, sameAlbum = false, false, false, true, false
				}

			}

			switch {
			case unique:
				listUnique = append(listUnique, photo)
			case keep:
				listKeep = append(listKeep, Duplicate{Photo: photo, Found: found})
			case delete:
				listDelete = append(listDelete, Duplicate{Photo: photo, Found: found})
			case conflict:
				listConflict = append(listConflict, Duplicate{Photo: photo, Found: found})
			case sameAlbum:
				listSameAlbum = append(listSameAlbum, Duplicate{Photo: photo, Found: found})
			}
		} else {
			listUnique = append(listUnique, photo)
		}
	}

	return map[string]interface{}{
		"albums":         maps.Values(listAlbums),
		"keep":           listKeep,
		"delete":         listDelete,
		"unique":         listUnique,
		"conflict":       listConflict,
		"samealbum":      listSameAlbum,
		"countKeep":      len(listKeep),
		"countDelete":    len(listDelete),
		"countUnique":    len(listUnique),
		"countConflict":  len(listConflict),
		"countSameAlbum": len(listSameAlbum),
		"total":          len(album.photosMap),
	}, nil
}
