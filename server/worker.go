package main

import (
	"io"
	"log"
	"sync"
	"time"
)

type ThumbWork struct {
	collection *Collection
	album      *Album
	photo      *Photo
	writer     io.Writer
	wg         *sync.WaitGroup
}

type InfoWork struct {
	file *File
	wg   *sync.WaitGroup
}

var (
	chThumbs chan *ThumbWork
	chInfo   chan *InfoWork
	wgThumbs sync.WaitGroup
	// Suspend background work
	bgWg    sync.WaitGroup
	bgTimer = time.NewTimer(0)
	bgReset = false
)

func InitWorkers(config CmdArgs) {
	// Workers for thumbnails
	chThumbs = make(chan *ThumbWork)
	for i := 0; i < config.nWorkersThumb; i++ {
		go func() {
			for w := range chThumbs {
				w.photo.GetThumbnail(w.collection, w.album, w.writer)
				w.wg.Done()
			}
		}()
	}

	// Workers to extract photos info
	chInfo = make(chan *InfoWork)
	for i := 0; i < config.nWorkersInfo; i++ {
		go func() {
			for w := range chInfo {
				w.file.ExtractInfo()
				w.wg.Done()
			}
		}()
	}
}

func SuspendBackgroundWork() {
	bgWg.Add(1)
}
func ResumeBackgroundWork() {
	// Wait 10 secs before resuming background work
	bgTimer.Reset(time.Second * 10)
	bgReset = true
	bgWg.Done()
}
func WaitBackgroundWork(runningInBackground bool) {
	if runningInBackground {
		bgWg.Wait()
		if bgReset {
			bgWg.Add(1)
			<-bgTimer.C
			bgReset = false
			bgWg.Done()
		}
	}
}

func AddExtractInfoWork(collection *Collection, album *Album, runningInBackground bool, files ...PhotoFile) <-chan string {
	ch := make(chan string)
	size := len(files)

	go func() {
		var wgList sync.WaitGroup
		wgList.Add(size)
		for i, file := range files {
			var wg sync.WaitGroup
			wg.Add(1)
			WaitBackgroundWork(runningInBackground)
			log.Printf("Extracting photo info %s[%s] %d/%d: %s", collection.Name, album.Name, i+1, size, file.file.Id)
			w := new(InfoWork)
			w.file = file.file
			w.wg = &wg
			chInfo <- w
			go func(id string) {
				wg.Wait()
				ch <- id
				wgList.Done()
			}(file.photoId)
		}
		wgList.Wait()
		close(ch)
	}()
	return ch
}

func AddThumbForeground(collection *Collection, album *Album, photo *Photo, writer io.Writer) {
	var wg sync.WaitGroup
	var w ThumbWork

	wg.Add(1)
	w.collection = collection
	w.album = album
	w.photo = photo
	w.writer = writer
	w.wg = &wg
	chThumbs <- &w
	wg.Wait()
}

func AddThumbsBackground(collection *Collection, album *Album, photos ...*Photo) {
	var wg sync.WaitGroup
	var size = len(photos)

	wg.Add(size)
	for i, photo := range photos {
		WaitBackgroundWork(true)
		log.Printf("Background thumbnail %s[%s] %d/%d: %s %s", collection.Name, album.Name, i+1, size, photo.Title, photo.SubAlbum)
		w := new(ThumbWork)
		w.collection = collection
		w.album = album
		w.photo = photo
		w.writer = nil
		w.wg = &wg
		chThumbs <- w
	}
	wg.Wait()
}
