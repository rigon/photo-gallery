package main

import (
	"bufio"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
)

type File struct {
	Type string `json:"type"`
	MIME string `json:"mime"`
	Url  string `json:"url"`
	Path string `json:"-"`
	Ext  string `json:"-"`
}

// Find which type (image or video) and MIME-type of the file
func (file *File) DetermineTypeAndMIME() error {
	f, err := os.Open(file.Path)
	if err != nil {
		return err
	}
	defer f.Close()

	// Only the first 512 bytes are used to sniff the content type,
	// as specified in http.DetectContentType
	buffer := make([]byte, 512)
	_, err = f.Read(buffer)
	if err != nil {
		return err
	}

	// Use the net/http package's handy DectectContentType function. Always returns a valid
	// content-type by returning "application/octet-stream" if no others seemed to match.
	file.MIME = http.DetectContentType(buffer)
	file.Ext = strings.ToLower(path.Ext(file.Path))

	switch {
	case strings.HasPrefix(file.MIME, "image/"):
		file.Type = "image"
	case strings.HasPrefix(file.Type, "video/"):
		file.Type = "video"
	default:
		// Unknown MIME types, determine using file extension
		switch file.Ext {
		case ".heic", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".tif":
			file.Type = "image"
		case ".mov", ".mp4", ".mpeg", ".avi":
			file.Type = "video"
			file.MIME = "video/mp4" // FIXME: force MP4 for the browser to be happy and play the video
		default:
			log.Printf("Unknown file type - ext: %s, mime: %s\n", file.Ext, file.Type)
			// TODO: handle unknown file types
		}
	}
	return nil
}

// If the file requires transcoding
func (file *File) RequiresConvertion() bool {
	if file.Type == "image" && file.Ext == ".heic" {
		return true
	}

	return false
}

func (file *File) Convert(w *bufio.Writer) error {
	// Decode original image
	img, exif, err := DecodeImage(file.Path)
	if err != nil {
		return err
	}

	// Encode thumbnail
	err = EncodeImage(w, img, exif)
	if err != nil {
		return err
	}
	return nil
}
