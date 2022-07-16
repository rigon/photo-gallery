package main

import (
	"log"
)

func CreateThumbnails(config Collection) {
	albums, err := ListAlbums(config)
	if err != nil {
		log.Fatal(err)
	}

	for _, album := range albums {
		album, err := GetAlbum(config, album.Name)
		if err != nil {
			log.Fatal(err)
		}

		album.GenerateThumbnails(config)
	}
}
