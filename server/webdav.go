package main

import (
	"context"
	"encoding/xml"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/net/webdav"
)

type webDavCollections map[string]*Collection

type webDavFileInfo struct {
	name       string
	isDir      bool
	path       string
	dir        webDavFileInfoable
	collection *Collection
	album      *Album
	file       *File
}

type webDavFileInfoable interface {
	webDavInfo(c *Collection, a *Album) webDavFileInfo
	webDavDir(info webDavFileInfo) ([]fs.FileInfo, error)
}

// Root (list collections)

func (cs webDavCollections) webDavInfo(collection *Collection, album *Album) webDavFileInfo {
	return webDavFileInfo{
		name:       "",
		isDir:      true,
		dir:        cs,
		collection: nil,
		album:      nil,
		file:       nil,
	}
}
func (cs webDavCollections) webDavDir(info webDavFileInfo) (list []fs.FileInfo, err error) {
	for _, collection := range cs {
		list = append(list, collection.webDavInfo(info.collection, info.album))
	}
	return list, nil
}

// Collection

func (collection *Collection) webDavInfo(c *Collection, a *Album) webDavFileInfo {
	return webDavFileInfo{
		name:       collection.Name,
		isDir:      true,
		dir:        collection,
		collection: nil,
		album:      nil,
		file:       nil,
	}
}
func (collection *Collection) webDavDir(info webDavFileInfo) (list []fs.FileInfo, err error) {
	albums, _ := collection.GetAlbums()
	for _, album := range albums {
		list = append(list, album.webDavInfo(info.collection, info.album))
	}
	return list, nil
}

// Album

func (album Album) webDavInfo(c *Collection, a *Album) webDavFileInfo {
	return webDavFileInfo{
		name:       album.Name,
		isDir:      true,
		dir:        album,
		collection: c,
		album:      nil,
		file:       nil,
	}
}
func (album Album) webDavDir(info webDavFileInfo) (list []fs.FileInfo, err error) {
	loadedAlbum, err := info.collection.GetAlbumWithPhotos(album.Name, false, false)
	if err != nil {
		return nil, err
	}
	for _, photo := range loadedAlbum.photosMap {
		for _, file := range photo.Files {
			list = append(list, file.webDavInfo(info.collection, info.album))
		}
	}
	return list, nil
}

// Photo file

func (file *File) webDavInfo(c *Collection, a *Album) webDavFileInfo {
	return webDavFileInfo{
		name:       file.Name(),
		path:       file.Path,
		isDir:      false,
		dir:        nil,
		collection: c,
		album:      a,
		file:       file,
	}
}
func (file File) webDavDir(info webDavFileInfo) (list []fs.FileInfo, err error) {
	return nil, nil
}

func WebDAVWithConfig(prefix string, collections map[string]*Collection) echo.MiddlewareFunc {
	wd := webdav.Handler{
		Prefix:     prefix,
		FileSystem: webDavCollections(collections),
		LockSystem: webdav.NewMemLS(),
		Logger: func(r *http.Request, err error) {
			if err != nil {
				log.Printf("WebDAV %s: %s, ERROR: %s\n", r.Method, r.URL, err)
			}
		},
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if strings.HasPrefix(c.Request().URL.Path, wd.Prefix) {
				wd.ServeHTTP(c.Response(), c.Request())
				return nil
			}
			return next(c)
		}
	}
}

func (cs webDavCollections) resolve(name string) (webDavFileInfo, error) {
	var collection *Collection
	var album *Album
	var photo *Photo
	var err error

	bits := strings.Split(name, "/")
	size := len(bits)

	// Root
	if size <= 1 {
		return cs.webDavInfo(nil, nil), nil
	}

	// Collection
	if size >= 2 {
		collection, err = GetCollection(bits[1])
		if err != nil {
			return webDavFileInfo{}, err
		}
		if size == 2 {
			return collection.webDavInfo(nil, nil), nil
		}
	}

	// Album
	if size >= 3 {
		if size == 3 { // for loading albums from a collection
			album, err = collection.GetAlbum(bits[2])
			if err != nil {
				return webDavFileInfo{}, err
			}
			return album.webDavInfo(collection, nil), nil
		}

		// for loading photos from album
		album, err = collection.GetAlbumWithPhotos(bits[2], false, false)
		if err != nil {
			return webDavFileInfo{}, err
		}
	}

	// Photo
	if size >= 4 {
		basename := bits[3]
		photoname := strings.TrimSuffix(basename, filepath.Ext(basename))
		photo, err = album.GetPhoto(photoname)
		if err != nil {
			return webDavFileInfo{}, err
		}
		if size == 4 {
			for _, file := range photo.Files {
				if file.Name() == basename {
					return file.webDavInfo(collection, album), nil
				}
			}
			return webDavFileInfo{}, errors.New("photo not found")
		}
	}

	return webDavFileInfo{}, errors.New("invalid request")
}

// File Info

func (fi webDavFileInfo) Name() string {
	return fi.name
}
func (fi webDavFileInfo) Size() int64 {
	if fi.file == nil {
		return 0
	}
	return fi.file.Size
}
func (fi webDavFileInfo) Mode() fs.FileMode {
	return os.ModeDir
}
func (fi webDavFileInfo) ModTime() time.Time {
	if fi.file != nil {
		return fi.file.Date
	}
	return time.Now()
}
func (fi webDavFileInfo) IsDir() bool {
	return fi.isDir
}
func (fi webDavFileInfo) Sys() any {
	return nil
}
func (fi webDavFileInfo) Close() error {
	return nil
}
func (fi webDavFileInfo) Read(p []byte) (n int, err error) {
	return 0, errors.New("read not supported")
}
func (fi webDavFileInfo) Seek(offset int64, whence int) (int64, error) {
	return 0, errors.New("seek not supported")
}
func (fi webDavFileInfo) Readdir(count int) ([]fs.FileInfo, error) {
	return fi.dir.webDavDir(fi)
}
func (fi webDavFileInfo) Stat() (fs.FileInfo, error) {
	return fi, nil
}
func (fi webDavFileInfo) Write(p []byte) (n int, err error) {
	return 0, errors.New("write not supported")
}
func (fi webDavFileInfo) DeadProps() (map[xml.Name]webdav.Property, error) {
	if fi.file == nil {
		return nil, nil
	}

	name := xml.Name{Space: "DAV:", Local: "getcontenttype"}
	props := make(map[xml.Name]webdav.Property)
	props[name] = webdav.Property{
		XMLName:  name,
		InnerXML: []byte(fi.file.MIME),
	}
	return props, nil
}
func (fi webDavFileInfo) Patch([]webdav.Proppatch) ([]webdav.Propstat, error) {
	return nil, nil
}

// Webdav actions

func (cs webDavCollections) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	return errors.New("not implemented Mkdir")
}
func (cs webDavCollections) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	info, err := cs.resolve(name)
	if err != nil {
		return nil, err
	}
	return info, nil
}
func (cs webDavCollections) RemoveAll(ctx context.Context, name string) error {
	return errors.New("not implemented RemoveAll")
}
func (cs webDavCollections) Rename(ctx context.Context, oldName, newName string) error {
	return errors.New("not implemented Rename")
}
func (cs webDavCollections) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	info, err := cs.resolve(name)
	if err != nil {
		return nil, err
	}
	return info, nil
}
