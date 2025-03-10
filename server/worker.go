package main

import (
	"io"
	"log"
	"sync"
	"sync/atomic"
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

type ActiveWorkers struct {
	thumbs int32
	info   int32
}

var (
	chThumbs chan *ThumbWork
	chInfo   chan *InfoWork
	// Suspend background work
	bgWg    sync.WaitGroup
	bgTimer = time.NewTimer(0)
	bgReset = false
	counter ActiveWorkers
)

func InitWorkers(config CmdArgs) {
	// Workers for thumbnails
	chThumbs = make(chan *ThumbWork)
	for i := 0; i < config.nWorkersThumb; i++ {
		go func() {
			for w := range chThumbs {
				atomic.AddInt32(&counter.thumbs, 1)
				w.photo.GetThumbnail(w.collection, w.album, w.writer)
				atomic.AddInt32(&counter.thumbs, -1)
				w.wg.Done()
			}
		}()
	}

	// Workers to extract photos info
	chInfo = make(chan *InfoWork)
	for i := 0; i < config.nWorkersInfo; i++ {
		go func() {
			for w := range chInfo {
				atomic.AddInt32(&counter.info, 1)
				w.file.ExtractInfo()
				atomic.AddInt32(&counter.info, -1)
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
func WaitBackgroundWork() {
	bgWg.Wait()
	if bgReset {
		bgWg.Add(1)
		<-bgTimer.C
		bgReset = false
		bgWg.Done()
	}
}

func AddExtractInfoWork(runningInBackground bool, files ...*File) *sync.WaitGroup {
	var wg sync.WaitGroup
	var size = len(files)

	wg.Add(size)
	for _, file := range files {
		if runningInBackground {
			WaitBackgroundWork()
		}
		w := new(InfoWork)
		w.file = file
		w.wg = &wg
		chInfo <- w
	}
	return &wg
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

func AddThumbsBackground(collection *Collection, album *Album, photos ...*Photo) *sync.WaitGroup {
	var wg sync.WaitGroup
	var size = len(photos)

	wg.Add(size)
	for i, photo := range photos {
		WaitBackgroundWork()
		log.Printf("Background thumbnail %s[%s] %d/%d: %s %s", collection.Name, album.Name, i+1, size, photo.Id, photo.SubAlbum)
		w := new(ThumbWork)
		w.collection = collection
		w.album = album
		w.photo = photo
		w.writer = nil
		w.wg = &wg
		chThumbs <- w
	}
	return &wg
}
