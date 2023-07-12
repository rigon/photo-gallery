package main

import (
	"errors"
	"image"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dustin/go-humanize"
	"github.com/mholt/goexif2/exif"
	"github.com/mholt/goexif2/tiff"
)

type File struct {
	Path        string      `json:"-"`
	Id          int         `json:"id"`
	Type        string      `json:"type"`
	MIME        string      `json:"mime"`
	Width       int         `json:"width"`    // Image Width
	Height      int         `json:"height"`   // Image Height
	Date        time.Time   `json:"date"`     // Image Date taken
	Location    GPSLocation `json:"location"` // Image location
	Orientation Orientation `json:"-"`        // Image orientation
}

type FileExtendedInfo struct {
	Type     string `json:"type"`
	MIME     string `json:"mime"`
	FileStat struct {
		Name      string    `json:"name"`      // base name of the file
		Size      int64     `json:"size"`      // length in bytes for regular files; system-dependent for others
		SizeHuman string    `json:"sizehuman"` // length in a human readable format
		Perm      string    `json:"perm"`      // file permissions
		ModTime   time.Time `json:"modtime"`   // modification time
	} `json:"filestat"`
	ImageInfo struct {
		Format   string      `json:"format"`   // Image Format
		Width    int         `json:"width"`    // Image Width
		Height   int         `json:"height"`   // Image Height
		Date     time.Time   `json:"date"`     // Image Date taken
		Location GPSLocation `json:"location"` // Image location
		Exif     *exif.Exif  `json:"exif"`     // Image EXIF data
	} `json:"imageinfo"`
}

type GPSLocation struct {
	Present bool    `json:"present"`
	Lat     float64 `json:"lat"` // Latitude
	Long    float64 `json:"lng"` // Longitude
}

func (file *File) Name() string {
	return filepath.Base(file.Path)
}
func (file *File) Ext() string {
	return strings.ToLower(filepath.Ext(file.Path))
}

// Find which type (image or video) and MIME-type of the file
func (file *File) ExtractInfo() error {
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

	switch {
	case strings.HasPrefix(file.MIME, "image/"):
		file.Type = "image"
	case strings.HasPrefix(file.Type, "video/"):
		file.Type = "video"
	default:
		// Unknown MIME types, determine using file extension
		switch file.Ext() {
		case ".heic", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".tiff", ".tif":
			file.Type = "image"
		case ".mov", ".mp4", ".mpeg", ".avi":
			file.Type = "video"
			file.MIME = "video/mp4" // FIXME: force MP4 for the browser to be happy and play the video
		default:
			log.Printf("Unknown file type - ext: %s, mime: %s\n", file.Ext(), file.Type)
			// TODO: handle unknown file types
		}
	}

	switch file.Type {
	case "image":
		_, cfg, exifInfo, err := ExtractImageConfigOpened(f)
		if cfg.Width < 1 || cfg.Height < 1 {
			file.Width = 200
			file.Height = 200
		} else {
			file.Width = cfg.Width
			file.Height = cfg.Height
		}
		if err == nil {
			// If date is available from EXIF
			file.Date, _ = exifInfo.DateTime()
			// If GPS Location is available from EXIF
			file.Location.Lat, file.Location.Long, err = exifInfo.LatLong()
			file.Location.Present = (err == nil) // Location present if no errors
			// Image orientation
			orient, err := exifInfo.Get(exif.Orientation)
			if err == nil && orient.Count == 1 && orient.Format() == tiff.IntVal {
				orientInt, _ := orient.Int(0)
				file.Orientation = Orientation(orientInt)
				// Dimensions are swapped due to orientation
				switch file.Orientation {
				case orientationRotate90,
					orientationRotate270,
					orientationTranspose,
					orientationTransverse:
					file.Width, file.Height = file.Height, file.Width
				}
			} else {
				file.Orientation = orientationUnspecified // tag not present
			}
		} else {
			// File Modification Date otherwise
			fileInfo, err := os.Stat(file.Path)
			if err == nil {
				file.Date = fileInfo.ModTime()
			}
			file.Location.Present = false
		}
	case "video":
		// TODO: extract info for video
		file.Width = 1920
		file.Height = 1080
	}

	return nil
}

func (file *File) ExtractExtendedInfo() (info FileExtendedInfo, err error) {
	// Copy some data from File
	info.Type = file.Type
	info.MIME = file.MIME
	// Stat file info
	fileInfo, err := os.Stat(file.Path)
	if err != nil {
		return info, err
	}
	info.FileStat.Name = fileInfo.Name()
	info.FileStat.Size = fileInfo.Size()
	info.FileStat.SizeHuman = humanize.IBytes(uint64(fileInfo.Size()))
	info.FileStat.ModTime = fileInfo.ModTime()
	info.FileStat.Perm = fileInfo.Mode().Perm().String()

	// File format info
	switch file.Type {
	case "image":
		ii := &info.ImageInfo
		// Copy some data from File
		ii.Width = file.Width
		ii.Height = file.Height
		ii.Date = file.Date
		ii.Location = file.Location
		// Extract info
		ii.Format, _, ii.Exif, err = ExtractImageInfo(file.Path)
		if err != nil {
			log.Println("error while extracting image info", err)
		}
	case "video":
		log.Println("video info extraction not yet implemented")
		return info, nil
	default:
		return info, errors.New("invalid info extraction")
	}
	return
}

// If the file requires transcoding like files that are not supported by the browser
func (file *File) RequiresConvertion() bool {
	if file.Type == "image" && file.Ext() == ".heic" {
		return true
	}

	return false
}

func (file *File) Convert(w io.Writer) error {
	switch file.Type {
	case "image":
		// Check for EXIF
		_, _, exifInfo, _ := ExtractImageInfo(file.Path)
		var exifData []byte
		if exifInfo != nil {
			exifData = exifInfo.Raw
		}

		// Decode original image
		img, err := DecodeImage(file.Path, file.Orientation)
		if err != nil {
			return err
		}

		// Encode thumbnail
		err = EncodeImage(w, img, exifData)
		if err != nil {
			return err
		}
	case "video":
		return errors.New("conversion not yet implemented")
	}
	return errors.New("invalid conversion")
}

func (file File) CreateThumbnail(thumbpath string, w io.Writer) (err error) {
	var img image.Image

	switch file.Type {
	case "image":
		// Decode original image
		img, err = DecodeImage(file.Path, file.Orientation)
	case "video":
		// Get a frame from the video
		img, err = GetVideoFrame(file.Path)
	}

	// Error decoding image from source
	if err != nil {
		return
	}

	return CreateThumbnailFromImage(img, thumbpath, w)
}
