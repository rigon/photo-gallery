package main

import (
	"io"
	"log"
	"runtime"
	"sync"
)

type Work struct {
	collection *Collection
	album      *Album
	photo      *Photo
	writer     io.Writer
	wg         *sync.WaitGroup
}

var (
	NT = runtime.NumCPU()
	ch = make(chan *Work, NT)
	wg sync.WaitGroup
)

func init() {
	for i := 0; i < NT; i++ {
		go func() {
			for w := range ch {
				w.photo.GetThumbnail(w.collection, w.album, w.writer)
				w.wg.Done()
			}
		}()
	}
}

func AddWorkPhoto(collection *Collection, album *Album, photo *Photo, writer io.Writer) {
	wg := new(sync.WaitGroup)
	wg.Add(1)

	w := new(Work)
	w.collection = collection
	w.album = album
	w.photo = photo
	w.writer = writer
	w.wg = wg
	ch <- w
	wg.Wait()
}

func AddWorkPhotos(collection *Collection, album *Album) {
	size := len(album.photosMap)
	count := 0
	for _, photo := range album.photosMap {
		count++
		log.Printf("Background thumbnail %s[%s] %d/%d: %s %s", collection.Name, album.Name, count, size, photo.Title, photo.SubAlbum)
		wg.Add(1)
		w := new(Work)
		w.collection = collection
		w.album = album
		w.photo = photo
		w.writer = nil
		w.wg = &wg
		ch <- w
	}
}
