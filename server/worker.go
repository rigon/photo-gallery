package main

import (
	"io"
	"log"
	"runtime"
	"sync"
	"time"
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
	fg sync.WaitGroup
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

func SuspendBackgroundWork() {
	fg.Add(1)
}
func WaitBackgroundWork() {
	fg.Wait()
}
func ResumeBackgroundWork() {
	go func() {
		// Wait 10 secs before resuming background work
		time.Sleep(time.Second * 10)
		fg.Done()
	}()
}

func AddWorkForeground(collection *Collection, album *Album, photo *Photo, writer io.Writer) {
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

func AddWorkBackground(collection *Collection, album *Album, photos ...*Photo) {
	size := len(photos)
	for i, photo := range photos {
		log.Printf("Background thumbnail %s[%s] %d/%d: %s %s", collection.Name, album.Name, i+1, size, photo.Title, photo.SubAlbum)
		wg.Add(1)
		w := new(Work)
		w.collection = collection
		w.album = album
		w.photo = photo
		w.writer = nil
		w.wg = &wg
		ch <- w
		WaitBackgroundWork()
	}
	wg.Wait()
}
