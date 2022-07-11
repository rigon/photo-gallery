package main

import (
	"log"
	"sync"
)

type Work struct {
	config AppConfig
	album  Album
	photo  Photo
}

var (
	NT = 2 //runtime.NumCPU()
	ch = make(chan *Work, NT)
	wg sync.WaitGroup
)

func init() {
	for i := 0; i < NT; i++ {
		go func() {
			for w := range ch {
				w.photo.GetThumbnail(nil, w.config, w.album)
				wg.Done()
			}
		}()
	}
}

func AddWork(config AppConfig, album Album, photos ...*Photo) {
	for _, photo := range photos {
		log.Printf("Background Thumb [%s] %s\n", album.Name, photo.Title)
		wg.Add(1)
		w := new(Work)
		w.config = config
		w.album = album
		w.photo = *photo
		ch <- w
	}
}
