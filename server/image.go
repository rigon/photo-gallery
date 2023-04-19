package main

import (
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/png"
	"io"
	"log"
	"os"

	// Fork from standard library "image/jpeg" that decodes corrupted images
	// REMINDER: check for updates
	"gitlab.com/golang-utils/image2/jpeg"

	_ "github.com/adrium/goheif"
	"github.com/disintegration/imaging"
	"github.com/mholt/goexif2/exif"
	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/vp8"
	_ "golang.org/x/image/vp8l"
	_ "golang.org/x/image/webp"
)

// Skip Writer for exif writing
type writerSkipper struct {
	w           io.Writer
	bytesToSkip int
}

// From: https://github.com/disintegration/imaging/blob/d40f48ce0f098c53ab1fcd6e0e402da682262da5/io.go#L285
// orientation is an EXIF flag that specifies the transformation
// that should be applied to image to display it correctly.
type Orientation int

const (
	orientationUnspecified = 0
	orientationNormal      = 1
	orientationFlipH       = 2
	orientationRotate180   = 3
	orientationFlipV       = 4
	orientationTranspose   = 5
	orientationRotate270   = 6
	orientationTransverse  = 7
	orientationRotate90    = 8
)

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

func EncodeImage(w io.Writer, image image.Image, exifData []byte) error {
	writer, err := newWriterExif(w, exifData)
	if err != nil {
		log.Println("Warning: could not write EXIF data")
	}

	return jpeg.Encode(writer, image, nil)
}

func DecodeImage(filepath string, orientation Orientation) (image.Image, error) {
	// Open input file image
	fin, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}
	defer fin.Close()
	// Decode image
	img, format, err := image.Decode(fin)
	if err != nil {
		return nil, fmt.Errorf("error decoding image type %s: %v", format, err)
	}

	// From: https://github.com/disintegration/imaging/blob/d40f48ce0f098c53ab1fcd6e0e402da682262da5/io.go#L424
	switch orientation {
	case orientationNormal:
	case orientationFlipH:
		img = imaging.FlipH(img)
	case orientationFlipV:
		img = imaging.FlipV(img)
	case orientationRotate90:
		img = imaging.Rotate90(img)
	case orientationRotate180:
		img = imaging.Rotate180(img)
	case orientationRotate270:
		img = imaging.Rotate270(img)
	case orientationTranspose:
		img = imaging.Transpose(img)
	case orientationTransverse:
		img = imaging.Transverse(img)
	}

	return img, nil
}

func ExtractImageInfo(filepath string) (string, image.Config, *exif.Exif, error) {
	// Open input file image
	fin, err := os.Open(filepath)
	if err != nil {
		return "", image.Config{}, nil, err
	}
	defer fin.Close()

	return ExtractImageConfigOpened(fin)
}

func ExtractImageConfigOpened(fin *os.File) (format string, config image.Config, exifData *exif.Exif, err error) {
	// Rewind to the start
	fin.Seek(0, io.SeekStart)

	// Decode image configuration
	config, format, err = image.DecodeConfig(fin)
	if err != nil {
		return
	}

	// Rewind to the start
	fin.Seek(0, io.SeekStart)

	// Extract EXIF
	exifData, err = exif.Decode(fin)
	if err != nil {
		return
	}

	return
}

func CreateThumbnailFromImage(img image.Image, thumbpath string, w io.Writer) error {
	if img == nil {
		return errors.New("invalid image")
	}

	// Open output file thumbnail
	fout, err := os.OpenFile(thumbpath, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		return err
	}
	defer fout.Close()

	// Resize image for thumbnail size
	img = imaging.Resize(img, 0, 200, imaging.Lanczos)

	// Encode thumbnail
	var mw io.Writer = fout
	if w != nil {
		mw = io.MultiWriter(w, fout)
	}
	err = EncodeImage(mw, img, nil)
	if err != nil {
		return err
	}

	return nil // No error
}
