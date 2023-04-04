package main

import "log"

func CreateThumbnails(collection *Collection) {
	albums, err := collection.GetAlbums()
	if err != nil {
		log.Fatal(err)
	}

	for _, album := range albums {
		album, err := collection.GetAlbumWithPhotos(album.Name, false)
		if err != nil {
			log.Fatal(err)
		}

		album.GenerateThumbnails(collection)
	}
}
