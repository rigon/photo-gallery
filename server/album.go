package main

import (
	"bufio"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

const PSEUDO_ALBUM_EXT = ".PG-ALBUM"

type Album struct {
	Name     string   `json:"name"`
	Count    int      `json:"count"`
	Date     string   `json:"title"`
	Photos   []*Photo `json:"photos"`
	IsPseudo bool     `json:"pseudo"`
}

func ListAlbums(config Collection) (albums []*Album, err error) {
	albums = make([]*Album, 0)

	files, err := ioutil.ReadDir(config.PhotosPath)
	if err != nil {
		return
	}

	for _, file := range files {
		filename := file.Name()
		if file.IsDir() && !strings.HasPrefix(filename, ".") {
			// Albums (do not show hidden folders)
			album := new(Album)
			album.Name = filename
			album.IsPseudo = false
			albums = append(albums, album)
		} else if file.Mode().IsRegular() && strings.HasSuffix(strings.ToUpper(filename), PSEUDO_ALBUM_EXT) {
			// Pseudo Albums
			album := new(Album)
			album.Name = filename[:len(filename)-len(PSEUDO_ALBUM_EXT)]
			album.IsPseudo = true
			albums = append(albums, album)
		}
	}
	return
}

func FindAlbum(config Collection, albumName string) (*Album, error) {
	albums, _ := ListAlbums(config)
	for _, elem := range albums {
		if elem.Name == albumName { // Found
			return elem, nil
		}
	}

	return nil, errors.New("album not found")
}

func GetAlbum(config Collection, albumName string) (album *Album, err error) {
	album, err = FindAlbum(config, albumName)
	if err != nil {
		return
	}

	album.GetPhotos(config)
	album.Count = len(album.Photos)
	return
}

func (album *Album) GetPhotos(config Collection) error {
	photos := make(map[string]*Photo)

	if album.IsPseudo {
		filename := filepath.Join(config.PhotosPath, album.Name+PSEUDO_ALBUM_EXT)
		file, err := os.Open(filename)
		if err != nil {
			fmt.Println(err)
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := scanner.Text()
			split := strings.Split(line, ":")
			if len(split) != 3 {
				log.Println("The following line is not formated correctly:", line)
				break
			}
			// Decompose slice
			collectionName, albumName, photoName := split[0], split[1], strings.ToLower(split[2])

			collection := GetCollection(collectionName)
			album, _ := GetAlbum(*collection, albumName)

			// Create a new photo
			photo := new(Photo)
			photo.Title = photoName
			photo.Thumb = path.Join("/collection", collectionName, "album", albumName, "photo", photoName, "thumb")
			photo.Height = 1
			photo.Width = 1 // + rand.Intn(2)
			//photo.Files = make([]File, 0)
			for _, p := range album.Photos {
				if p.Title == photoName {
					photo.Files = p.Files
					break
				}
			}
			photos[photoName] = photo
		}
		if err := scanner.Err(); err != nil {
			fmt.Println(err)
		}
	} else {
		// Read album (or folder) contents
		files, err := ioutil.ReadDir(filepath.Join(config.PhotosPath, album.Name))
		if err != nil {
			log.Fatal(err)
		}

		// Iterate over folder items
		for _, file := range files {
			if !file.IsDir() {
				fileExt := path.Ext(file.Name())
				fileName := strings.ToLower(strings.TrimSuffix(file.Name(), fileExt))

				photo, photoExists := photos[fileName]
				if !photoExists {
					photo = new(Photo)
					photo.Title = fileName
					photo.Thumb = path.Join("/collection", config.Name, "album", album.Name, "photo", fileName, "thumb")
					photo.Height = 1
					photo.Width = 1 // + rand.Intn(2)
					photos[fileName] = photo
				}
				photoFile := File{
					Path: filepath.Join(config.PhotosPath, album.Name, file.Name()),
					Url:  path.Join("/collection", config.Name, "album", album.Name, "photo", fileName, "file", strconv.Itoa(len(photo.Files)))}
				photoFile.DetermineType()

				photo.Files = append(photo.Files, photoFile)
			}
		}
	}

	album.Photos = make([]*Photo, 0, len(photos))
	for _, photo := range photos {
		photo.DetermineType()
		album.Photos = append(album.Photos, photo)
	}

	// Sort photos by name (ascending)
	sort.Slice(album.Photos, func(i, j int) bool {
		return album.Photos[i].Title < album.Photos[j].Title
	})

	return nil
}

func (album *Album) FindPhoto(photoName string) (*Photo, error) {
	for _, photo := range album.Photos {
		if photo.Title == photoName { // Found
			return photo, nil
		}
	}

	return nil, errors.New("photo not found in album: [" + album.Name + "] " + photoName)
}

func (album Album) GenerateThumbnails(config Collection) {
	album.GetPhotos(config)
	AddWorkPhotos(config, album, album.Photos...)
}
