package main

import (
	"net/http"
	"os"
	"path"
	"strings"
)

type File struct {
	Type string `json:"type"`
	Url  string `json:"url"`
	Path string `json:"-"`
}

func (file *File) DetermineType() error {
	f, err := os.Open(file.Path)
	if err != nil {
		return err
	}
	defer f.Close()

	// Only the first 512 bytes are used to sniff the content type.
	buffer := make([]byte, 512)
	_, err = f.Read(buffer)
	if err != nil {
		return err
	}

	// Use the net/http package's handy DectectContentType function. Always returns a valid
	// content-type by returning "application/octet-stream" if no others seemed to match.
	filetype := http.DetectContentType(buffer)
	fileext := strings.ToLower(path.Ext(file.Path))

	switch {
	case strings.HasPrefix(filetype, "image/"):
		file.Type = "image"
	case strings.HasPrefix(filetype, "video/"):
		file.Type = "video"
	default:
		switch fileext {
		case ".heic":
			file.Type = "image"
		case ".mov":
			file.Type = "video"
		}
	}

	return nil
}
