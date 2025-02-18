package main

import (
	"errors"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"

	"golang.org/x/exp/slices"
)

type AlbumMoveQuery struct {
	Collection string   `json:"collection"` // target collection
	Album      string   `json:"album"`      // target album
	Photos     []string `json:"photos"`     // list of photo names to move
	Mode       string   `json:"mode"`       // move mode: cancel, skip, rename
}

type AlbumDeleteQuery struct {
	Photos []string `json:"photos"` // list of photo names to delete
}

type PhotoMove struct {
	src *Photo
	dst *Photo
}

// Compile the regular expression that matches " (number)" from the end
var RenameSeqRegExp = regexp.MustCompile(`\s\(\d+\)$`)

// Taken from https://github.com/valyala/fasthttp/blob/0d0bbfee5a8dd12a82e442d3cbb11e56726dd06e/server.go#L1048
// SaveMultipartFile saves multipart file fh under the given filename path.
func SaveMultipartFile(fh *multipart.FileHeader, path string) (err error) {
	var (
		f  multipart.File
		ff *os.File
	)
	f, err = fh.Open()
	if err != nil {
		return
	}

	var ok bool
	if ff, ok = f.(*os.File); ok {
		// Windows can't rename files that are opened.
		if err = f.Close(); err != nil {
			return
		}

		// If renaming fails we try the normal copying method.
		// Renaming could fail if the files are on different devices.
		if os.Rename(ff.Name(), path) == nil {
			return nil
		}

		// Reopen f for the code below.
		if f, err = fh.Open(); err != nil {
			return
		}
	}

	defer func() {
		e := f.Close()
		if err == nil {
			err = e
		}
	}()

	if ff, err = os.Create(path); err != nil {
		return
	}
	defer func() {
		e := ff.Close()
		if err == nil {
			err = e
		}
	}()
	_, err = io.Copy(ff, f)
	return
}

func RenameFilename(filename string, renameIndex int) string {
	if renameIndex < 2 {
		return filename
	}

	ext := path.Ext(filename)
	// Extract name and remove anything like " (number)" from the end
	name := RenameSeqRegExp.ReplaceAllString(strings.TrimSuffix(filename, ext), "")

	return fmt.Sprintf("%s (%d)%s", name, renameIndex, ext)
}

// Create a new copy of the photo object to used when moving
func (photo *Photo) CopyForMove(dstCollection *Collection, dstAlbum *Album, renameFilesSeq int) *Photo {
	var files []*File
	for _, file := range photo.Files {
		rename := RenameFilename(file.Name(), renameFilesSeq)
		files = append(files, &File{
			// Changed fields
			Id:   rename,
			Path: filepath.Join(dstCollection.PhotosPath, dstAlbum.Name, rename),
			// Copy the remainder
			Type:        file.Type,
			MIME:        file.MIME,
			Width:       file.Width,
			Height:      file.Height,
			Date:        file.Date,
			Location:    file.Location,
			Orientation: file.Orientation,
			Size:        file.Size,
		})
	}
	//name := strings.TrimSuffix(files[0].Name(), filepath.Ext(files[0].Name()))
	name := RenameFilename(photo.Title, renameFilesSeq)
	return &Photo{
		// Changed fields
		Id:         strings.ToLower(name),
		Title:      name,
		Collection: dstCollection.Name,
		Album:      dstAlbum.Name,
		SubAlbum:   "", // Move into a sub-album not supported
		Files:      files,
		// Copy the remainder
		HasThumb: photo.HasThumb,
		Type:     photo.Type,
		Width:    photo.Width,
		Height:   photo.Height,
		Date:     photo.Date,
		Location: photo.Location,
		Favorite: photo.Favorite,
	}
}

func UpdateFavorites(photos []PhotoMove) {
	var favorites = make(map[string]map[string][]PhotoMove)

	// Group favorites by Collection and Album
	for _, photo := range photos {
		for _, favorite := range photo.src.Favorite {
			if _, ok := favorites[favorite.Collection]; !ok {
				favorites[favorite.Collection] = make(map[string][]PhotoMove)
			}
			favorites[favorite.Collection][favorite.Album] = append(favorites[favorite.Collection][favorite.Album], photo)
		}
	}

	for collectionName, albums := range favorites {
		// Load collection
		collection, err := GetCollection(collectionName)
		if err != nil {
			log.Println(err)
			continue
		}
		for albumName, photos := range albums {
			// Load album with photos
			album, err := collection.GetAlbum(albumName)
			if err != nil {
				log.Println(err)
				continue
			}
			// Load entries of the pseudo-album
			entries, err := readPseudoAlbum(collection, album)
			if err != nil {
				log.Println(err)
				continue
			}
			for i, entry := range entries {
				for _, photo := range photos {
					src, dst := photo.src, photo.dst
					if entry.Collection == src.Collection && entry.Album == src.Album && entry.Photo == src.Id {
						entries[i] = PseudoAlbumEntry{
							Collection: dst.Collection,
							Album:      dst.Album,
							Photo:      dst.Id,
						}
					}
				}
			}
			// Write back updated entries of the pseudo-album
			writePseudoAlbum(collection, album, entries...)
		}
	}
}

func DeleteFavorites(photos *[]*Photo) {
	var favorites = make(map[string]map[string][]*Photo)

	// Group favorites by Collection and Album
	for _, photo := range *photos {
		for _, favorite := range photo.Favorite {
			if _, ok := favorites[favorite.Collection]; !ok {
				favorites[favorite.Collection] = make(map[string][]*Photo)
			}
			favorites[favorite.Collection][favorite.Album] = append(favorites[favorite.Collection][favorite.Album], photo)
		}
	}

	for collectionName, albums := range favorites {
		// Load collection
		collection, err := GetCollection(collectionName)
		if err != nil {
			log.Println(err)
			continue
		}
		for albumName, photos := range albums {
			// Load album with photos
			album, err := collection.GetAlbum(albumName)
			if err != nil {
				log.Println(err)
				continue
			}
			// Load entries of the pseudo-album
			entries, err := readPseudoAlbum(collection, album)
			if err != nil {
				log.Println(err)
				continue
			}
			for i, entry := range entries {
				for _, photo := range photos {
					if entry.Collection == photo.Collection && entry.Album == photo.Album && entry.Photo == photo.Id {
						entries = slices.Delete(entries, i, i+1)
					}
				}
			}
			// Write back updated entries of the pseudo-album
			writePseudoAlbum(collection, album, entries...)
		}
	}
}

func (srcAlbum *Album) MovePhotos(mode string, srcCollection *Collection, dstCollection *Collection, dstAlbum *Album, photoNames ...string) (map[string]int, error) {
	defer srcCollection.cache.FlushInfo()
	defer dstCollection.cache.FlushInfo()

	var photos []*Photo

	// Stats
	countMovedPhotos := 0
	countMovedFiles := 0
	countSkippedPhotos := 0
	countRenamedPhotos := 0

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
	var movePhotos []PhotoMove
	var renamePhotos []*Photo
	var moveFilesPath map[string]bool = make(map[string]bool)
	for _, photo := range photos {
		// Create a copy of photo updated to the new destination
		newPhoto := photo.CopyForMove(dstCollection, dstAlbum, 1)

		// Check if any of the files exists in the destination
		exists := false
		for _, file := range newPhoto.Files {
			// File already exists
			if _, err := os.Stat(file.Path); err == nil {
				exists = true
			}
			// File will exist after moving
			if _, ok := moveFilesPath[file.Path]; ok {
				exists = true
			} else {
				moveFilesPath[file.Path] = true
			}
		}
		if exists {
			switch mode {
			case "cancel":
				return nil, errors.New("the destination file already exists")
			case "skip":
				countSkippedPhotos++
				continue
			case "rename":
				renamePhotos = append(renamePhotos, photo)
				continue
			}
		}
		movePhotos = append(movePhotos, PhotoMove{photo, newPhoto})
	}

	// Process photos with files that require renaming
	moveFilesPath = make(map[string]bool)
	for _, photo := range movePhotos {
		for _, file := range photo.dst.Files {
			moveFilesPath[file.Path] = true
		}
	}
	for _, photo := range renamePhotos {
		var newPhoto *Photo
		for seq, exists := 2, true; exists; seq++ {
			// Create a copy of photo updated to the new destination
			newPhoto = photo.CopyForMove(dstCollection, dstAlbum, seq)
			// Check if any of the files exists in the destination
			exists = false
			for _, file := range newPhoto.Files {
				_, err := os.Stat(file.Path)      // Existing files
				_, ok := moveFilesPath[file.Path] //Any of the files of the photos to be moved
				if ok || !os.IsNotExist(err) {
					exists = true
					break
				}
			}
		}
		// Add file paths to be moved
		for _, file := range newPhoto.Files {
			moveFilesPath[file.Path] = true
		}
		movePhotos = append(movePhotos, PhotoMove{photo, newPhoto})
		countRenamedPhotos++
	}

	// Update favorite albums with new Collection/Album
	UpdateFavorites(movePhotos)

	// Perform the actual move
	for _, photo := range movePhotos {
		// Move files
		for i, file := range photo.dst.Files {
			// Double check if we are not replacing files
			if _, err := os.Stat(file.Path); os.IsNotExist(err) {
				// Move the file to the new location with the new name
				err := os.Rename(photo.src.Files[i].Path, file.Path)
				if err != nil {
					return nil, err
				}
			} else {
				return nil, errors.New("the destination file already exists")
			}

			countMovedFiles++
		}

		// Move thumbnail
		srcThumbPath := photo.src.ThumbnailPath(srcCollection)
		dstThumbPath := photo.dst.ThumbnailPath(dstCollection)
		// Ensure the directories exist
		if err := os.MkdirAll(filepath.Dir(dstThumbPath), os.ModePerm); err == nil {
			err := os.Rename(srcThumbPath, dstThumbPath)
			if err != nil { // If not possible to rename, remove thumbnail for cleanup
				os.Remove(srcThumbPath)
			}
		}
		// Move photo info
		srcCollection.cache.DeletePhotoInfo(photo.src)
		dstCollection.cache.AddPhotoInfo(photo.dst)

		countMovedPhotos++
	}

	return map[string]int{
		"moved_photos": countMovedPhotos,
		"moved_files":  countMovedFiles,
		"skipped":      countSkippedPhotos,
		"renamed":      countRenamedPhotos,
	}, nil
}

func (album *Album) DeletePhotos(collection *Collection, photoNames ...string) error {
	var deletedPhotos []*Photo

	defer collection.cache.FlushInfo()
	defer DeleteFavorites(&deletedPhotos)

	for _, photoName := range photoNames {
		photo, err := album.GetPhoto(photoName)
		if err != nil {
			return err
		}

		// Remove files
		for _, file := range photo.Files {
			err := os.Remove(file.Path)
			if err != nil {
				return err
			}
		}

		// Add to remove from pseudo-albums where is favorite
		deletedPhotos = append(deletedPhotos, photo)

		// Remove info
		collection.cache.DeletePhotoInfo(photo)

		// Remove thumbnail
		thumbPath := photo.ThumbnailPath(collection)
		os.Remove(thumbPath)
	}
	return nil
}
