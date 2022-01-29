package main

import (
	"image/jpeg"
	"io"
	"log"
	"os"

	"github.com/adrium/goheif"
	"github.com/nfnt/resize"
)

// Skip Writer for exif writing
type writerSkipper struct {
	w           io.Writer
	bytesToSkip int
}

func (w *writerSkipper) Write(data []byte) (int, error) {
	if w.bytesToSkip <= 0 {
		return w.w.Write(data)
	}

	if dataLen := len(data); dataLen < w.bytesToSkip {
		w.bytesToSkip -= dataLen
		return dataLen, nil
	}

	if n, err := w.w.Write(data[w.bytesToSkip:]); err == nil {
		n += w.bytesToSkip
		w.bytesToSkip = 0
		return n, nil
	} else {
		return n, err
	}
}

func newWriterExif(w io.Writer, exif []byte) (io.Writer, error) {
	writer := &writerSkipper{w, 2}
	soi := []byte{0xff, 0xd8}
	if _, err := w.Write(soi); err != nil {
		return nil, err
	}

	if exif != nil {
		app1Marker := 0xe1
		markerlen := 2 + len(exif)
		marker := []byte{0xff, uint8(app1Marker), uint8(markerlen >> 8), uint8(markerlen & 0xff)}
		if _, err := w.Write(marker); err != nil {
			return nil, err
		}

		if _, err := w.Write(exif); err != nil {
			return nil, err
		}
	}

	return writer, nil
}

func convertPhoto(w io.Writer, filename string) {
	log.Printf("Converting %s\n", filename)
	fi, err := os.Open(filename)
	if err != nil {
		log.Fatal(err)
	}
	defer fi.Close()

	log.Printf("ExtractExif\t")
	exif, err := goheif.ExtractExif(fi)
	if err != nil {
		log.Printf("Warning: no EXIF from %s: %v\n", filename, err)
	}

	log.Printf("Decode\t")
	img, err := goheif.Decode(fi)
	if err != nil {
		log.Fatalf("Failed to parse %s: %v\n", filename, err)
	}

	log.Printf("Resize\t")
	resized := resize.Resize(0, 200, img, resize.Lanczos3)

	log.Printf("WriteExif\t")
	wimg, _ := newWriterExif(w, exif)
	log.Printf("Encode\t")
	err = jpeg.Encode(wimg, resized, nil)
	if err != nil {
		log.Fatalf("Failed to encode %s: %v\n", filename, err)
	}
	log.Printf("DONE\n")
}
