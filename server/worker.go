package main

import (
	"io"
	"log"
	"runtime"
	"sync"
)

type Work struct {
	config Collection
	album  Album
	photo  Photo
	writer io.Writer
	wg     *sync.WaitGroup
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
				w.photo.GetThumbnail(w.writer, w.config, w.album)
				w.wg.Done()
			}
		}()
	}
}

func AddWorkPhoto(writer io.Writer, config Collection, album Album, photo Photo) {
	wg := new(sync.WaitGroup)
	wg.Add(1)

	w := new(Work)
	w.config = config
	w.album = album
	w.photo = photo
	w.writer = writer
	w.wg = wg
	ch <- w
	wg.Wait()
}

func AddWorkPhotos(config Collection, album Album, photos ...*Photo) {
	for _, photo := range photos {
		log.Printf("Background Thumb [%s] %s\n", album.Name, photo.Title)
		wg.Add(1)
		w := new(Work)
		w.config = config
		w.album = album
		w.photo = *photo
		w.writer = nil
		w.wg = &wg
		ch <- w
	}
}
