package main

import (
	"errors"
	"fmt"
	"log"
	"math"
	"os"
	"path"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/shirou/gopsutil/disk"
	bolt "go.etcd.io/bbolt"
)

const DB_NAME_SUFFIX = "-cache.db"

type Collection struct {
	Index           int
	Name            string
	PhotosPath      string
	ThumbsPath      string
	Hide            bool
	ReadOnly        bool
	RenameOnReplace bool
	Db              *bolt.DB
	loadedAlbum     *Album
}

type CollectionResponse struct {
	Name    string            `json:"name"`
	Storage CollectionStorage `json:"storage"`
}
type CollectionStorage struct {
	Size       string `json:"size"`
	Free       string `json:"free"`
	Percentage int    `json:"percentage"`
}

type AddAlbumQuery struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func (c Collection) String() string {
	return fmt.Sprintf("%s (%s)", c.Name, c.PhotosPath)
}

func GetCollections(collections map[string]*Collection) []CollectionResponse {
	list := make([]CollectionResponse, len(collections))

	for _, c := range collections {
		if !c.Hide {
			st, err := c.StorageUsage()
			if err != nil {
				log.Println("Cannot retrieve storage usage for " + c.Name + ": " + err.Error())
			}
			list[c.Index] = CollectionResponse{Name: c.Name, Storage: *st}
		}
	}

	return list
}

func (c *Collection) OpenDB() error {
	var err error
	filename := path.Join(c.ThumbsPath, c.Name+DB_NAME_SUFFIX)
	c.Db, err = bolt.Open(filename, 0600, &bolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		log.Fatal(err)
	}
	return nil
}

func (c Collection) CloseDB() error {
	return c.Db.Close()
}

func (c Collection) AddAlbum(info AddAlbumQuery) error {
	name := info.Name
	if info.Type == "pseudo" {
		name += PSEUDO_ALBUM_EXT
	}
	p := path.Join(c.PhotosPath, name)

	// File or folder already exists, cannot overwrite
	if _, err := os.Stat(p); !errors.Is(err, os.ErrNotExist) {
		return err
	}

	switch info.Type {
	case "regular":
		// Create folder
		os.Mkdir(p, os.ModeDir)
	case "pseudo":
		file, err := os.Create(p)
		if err != nil {
			log.Fatal(err)
		}
		// Just touching the file
		file.Close()
	default:
		return errors.New("Invalid album type " + info.Type)
	}
	return nil
}

func (collection Collection) StorageUsage() (*CollectionStorage, error) {
	di, err := disk.Usage(collection.PhotosPath)
	if err != nil {
		return nil, err
	}
	percentage := (float64(di.Total-di.Free) / float64(di.Total)) * 100
	return &CollectionStorage{
		Size:       humanize.Bytes(di.Total),
		Free:       humanize.Bytes(di.Total - di.Free),
		Percentage: int(math.Round(percentage)),
	}, nil
}
