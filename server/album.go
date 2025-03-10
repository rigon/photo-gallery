package main

import (
	"io/fs"
	"log"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/timshannon/bolthold"
)

type Album struct {
	Name      string   `json:"name"`
	Count     int      `json:"count"`
	Date      string   `json:"title"`
	IsPseudo  bool     `json:"pseudo"`
	SubAlbums []string `json:"subalbums"`
}

func (album *Album) GetPhoto(collection *Collection, photoId string) (*Photo, error) {
	return collection.cache.GetPhoto(album.Name, photoId)
}

func (album *Album) LoadPhotos(collection *Collection, runInBackground bool) (map[string]*Photo, error) {
	return album.loadPhotosOpts(collection, false, false, runInBackground)
}
func (album *Album) ReloadPhotos(collection *Collection, runInBackground bool) (map[string]*Photo, error) {
	return album.loadPhotosOpts(collection, true, false, runInBackground)
}
func (album *Album) ReloadPhotosPartial(collection *Collection, runInBackground bool, idsToLoad ...string) (map[string]*Photo, error) {
	return album.loadPhotosOpts(collection, false, false, runInBackground, idsToLoad...)
}
func (album *Album) ForceReloadPhotos(collection *Collection, runInBackground bool) (map[string]*Photo, error) {
	return album.loadPhotosOpts(collection, false, true, runInBackground)
}
func (album *Album) loadPhotosOpts(collection *Collection, skipCached bool, forceUpdate bool, runInBackground bool, idsToLoad ...string) (map[string]*Photo, error) {
	collection.LockAlbum(album.Name)
	defer collection.UnlockAlbum(album.Name)

	// Skip albums that are cached, except if not skipCached or forceUpdate
	saved := collection.cache.IsCachedAlbumSaved(album.Name)
	if saved && skipCached && !forceUpdate {
		return nil, nil
	}

	// Load only some photos?
	isPartial := len(idsToLoad) > 0

	// Convert ids to maps for improved performance
	idsToLoadMap := make(map[string]struct{})
	for _, id := range idsToLoad {
		idsToLoadMap[id] = struct{}{}
	}

	subAlbums := make(map[string]struct{})
	photosMap := make(map[string]*Photo)

	if album.IsPseudo {
		// Read pseudo album
		log.Printf("Scanning pseudo-album %s[%s]...", collection.Name, album.Name)
		pseudos, err := readPseudoAlbum(collection, album)
		if err != nil {
			return nil, err
		}

		// TODO: idsToLoadMap

		// Get photos from pseudos
		photos := album.LoadPhotosForPseudo(collection, true, runInBackground, pseudos...)

		// Iterate over entries in the pseudo album
		for _, photo := range photos {
			photosMap[photo.Id] = photo
			subAlbums[photo.SubAlbum] = struct{}{}
		}
	} else {
		// Read album (i.e. folder) contents
		log.Printf("Scanning folder for album %s[%s]...", collection.Name, album.Name)

		// Count number of photos
		album.Count = 0

		root := filepath.Join(collection.PhotosPath, album.Name)
		err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			// Iterate over folder items
			if err != nil {
				return err
			}
			// Skip folders
			if d.IsDir() {
				return nil
			}
			// Get parameters
			name, ext := d.Name(), filepath.Ext(d.Name())
			// TODO: review relative paths: path can be absolute and root relative
			removedDir := strings.TrimPrefix(path, root+string(filepath.Separator))
			id := strings.ToLower(strings.ReplaceAll(strings.TrimSuffix(removedDir, ext), string(filepath.Separator), "|"))

			// Load only the selected photos
			if isPartial {
				if _, ok := idsToLoadMap[id]; !ok {
					return nil // Entry not found in the map, skip
				}
			}

			photo, ok := photosMap[id]
			if !ok {
				title := strings.TrimSuffix(name, ext)
				subAlbum := strings.TrimSuffix(strings.TrimSuffix(removedDir, name), string(filepath.Separator))
				// Create a new photo for photos not in cache or with refreshed data
				photo = &Photo{
					Id:         id,
					Title:      title,
					Collection: collection.Name,
					Album:      album.Name,
					SubAlbum:   subAlbum,
					Favorite:   []PseudoAlbum{},
				}

				photosMap[id] = photo
				// Map of sub-albums
				if subAlbum != "" {
					subAlbums[subAlbum] = struct{}{}
				}
			}

			photoFile := &File{
				Path: path,
				Id:   name,
			}
			photo.Files = append(photo.Files, photoFile)
			return nil
		})
		if err != nil {
			return nil, err
		}

		idsNoUpdateNeeded := make(map[string]struct{})
		err = collection.cache.store.ForEach(bolthold.Where("Album").Eq(album.Name).Index("Album"), func(photo *Photo) error {
			if isPartial {
				// Skip entries not in the map
				if _, ok := idsToLoadMap[photo.Id]; !ok {
					idsNoUpdateNeeded[photo.Id] = struct{}{} // Do not Extract Info
					return nil
				}
			}

			_, ok := photosMap[photo.Id]
			if ok {
				// Remove entries from being updated that are already cached
				if !forceUpdate {
					photosMap[photo.Id] = photo              // Replace entry with the cached one
					idsNoUpdateNeeded[photo.Id] = struct{}{} // Do not Extract Info
					album.Count++
				}
			} else {
				// Chached entry not found in the current scan (i.e. deleted externally)
				collection.cache.DeletePhotoInfo(photo)
			}
			return nil
		})
		if err != nil {
			log.Println(err)
		}

		// Determine photo info after processing all files
		var wgAll sync.WaitGroup
		var count = 0
		var total = len(photosMap) - len(idsNoUpdateNeeded)
		var addToThumbsQueue = false
		for id, photo := range photosMap {
			if _, ok := idsNoUpdateNeeded[id]; ok {
				continue // No updated needed
			}

			count++
			wgAll.Add(1)

			// Extract file info
			log.Printf("Extracting photo info %s[%s] %d/%d: %s", collection.Name, album.Name, count, total, photo.Id)
			wg := AddExtractInfoWork(runInBackground, photo.Files...)

			go func(wg *sync.WaitGroup, photo *Photo, count int) {
				defer wgAll.Done()
				wg.Wait()

				// Fill photo info after files of this photo were processed
				err := photo.FillInfo(collection)
				if err != nil {
					log.Println(err)
					return
				}

				switch photo.Type {
				case "image", "video", "live":
					// Update cache
					collection.cache.AddPhotoInfo(photo)
				default:
					// Skip photos without a recognized type
					log.Printf("photo with unrecognized format: [%s]%s: %s\n", photo.Collection, photo.Album, photo.Id)
				}
				// If any photo does not have thumbnail
				addToThumbsQueue = addToThumbsQueue || !photo.HasThumb
			}(wg, photo, count)
		}
		wgAll.Wait()
		collection.cache.FlushInfo(!runInBackground)

		// Album with photos that need a thumbnail generated
		if addToThumbsQueue {
			collection.cache.SetAlbumToThumbQueue(album.Name)
		}
	}

	// Set album photo count
	album.Count = len(photosMap)

	// List of sub-albums
	album.SubAlbums = []string{}
	for key := range subAlbums {
		album.SubAlbums = append(album.SubAlbums, key)
	}
	sort.Strings(album.SubAlbums)

	if !isPartial {
		collection.cache.SaveAlbum(album)
	}
	return photosMap, nil
}
