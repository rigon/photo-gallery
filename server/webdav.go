package main

import (
	"context"
	"errors"
	"io/fs"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/webdav"
)

type webDavCollections []*Collection

type collectionsNodeFS struct {
	cs webDavCollections // Used by root folder
	c  Collection        // Used by each collection
}

func (cs webDavCollections) find(name string) (*Collection, webdav.Dir, string, error) {
	for _, c := range cs {
		var prefix string = ""
		if name == c.Name {
			prefix = c.Name
		}
		if name == "/"+c.Name {
			prefix = "/" + c.Name
		}
		if strings.HasPrefix(name, "/"+c.Name+"/") {
			prefix = "/" + c.Name + "/"
		}
		if prefix != "" {
			return c, webdav.Dir(c.PhotosPath), strings.TrimPrefix(name, prefix), nil
		}
	}
	return nil, webdav.Dir(""), "", errors.New("collection not found")
}

func (c collectionsNodeFS) Readdir(count int) ([]fs.FileInfo, error) {
	children := make([]fs.FileInfo, len(c.cs))
	for i, c := range c.cs {
		children[i] = collectionsNodeFS{c: *c}
	}
	return children, nil
}
func (c collectionsNodeFS) Stat() (fs.FileInfo, error)                   { return collectionsNodeFS{}, nil }
func (c collectionsNodeFS) Write(p []byte) (n int, err error)            { return 0, nil }
func (c collectionsNodeFS) Close() error                                 { return nil }
func (c collectionsNodeFS) Read(p []byte) (n int, err error)             { return 0, nil }
func (c collectionsNodeFS) Seek(offset int64, whence int) (int64, error) { return 0, nil }

func (f collectionsNodeFS) Name() string       { return f.c.Name }
func (f collectionsNodeFS) Size() int64        { return 0 }
func (f collectionsNodeFS) Mode() os.FileMode  { return 0660 | os.ModeDir }
func (f collectionsNodeFS) ModTime() time.Time { return time.Now() }
func (f collectionsNodeFS) IsDir() bool        { return true }
func (f collectionsNodeFS) Sys() interface{}   { return nil }

func (cs webDavCollections) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	_, dir, name, err := cs.find(name)
	if err != nil {
		return err
	}
	return dir.Mkdir(ctx, name, perm)
}
func (cs webDavCollections) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	// Open root folder (i.e. list of collections)
	if name == "" {
		return collectionsNodeFS{cs: cs}, nil
	}

	c, dir, name, err := cs.find(name)
	if err != nil {
		return nil, err
	}

	if c.RenameOnReplace {
		// If file exists, create a new file instead with an increment
		if (flag & os.O_CREATE) == os.O_CREATE {
			for i := 1; true; i++ {
				f := name
				if i > 1 {
					ext := path.Ext(name)
					f = strings.TrimSuffix(name, ext) + "_" + strconv.Itoa(i) + ext
				}

				// Check if file doesnt exist
				_, err := dir.Stat(ctx, f)
				if err != nil {
					name = f
					break
				}
			}
		}
	}

	return dir.OpenFile(ctx, name, flag, perm)
}
func (cs webDavCollections) RemoveAll(ctx context.Context, name string) error {
	_, dir, name, err := cs.find(name)
	if err != nil {
		return err
	}
	return dir.RemoveAll(ctx, name)
}
func (cs webDavCollections) Rename(ctx context.Context, oldName, newName string) error {
	_, oldDir, oldName, err := cs.find(oldName)
	if err != nil {
		return err
	}
	_, newDir, newName, err := cs.find(newName)
	if err != nil {
		return err
	}
	if oldDir != newDir {
		return errors.New("can't move across collections")
	}
	return oldDir.Rename(ctx, oldName, newName)
}
func (cs webDavCollections) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	// Stat for root folder (i.e. list of collections)
	if name == "" {
		return collectionsNodeFS{cs: cs}, nil
	}
	_, dir, name, err := cs.find(name)
	if err != nil {
		return nil, err
	}
	return dir.Stat(ctx, name)
}

func CreateWebDavFS(collections []*Collection) webdav.FileSystem {
	return webDavCollections(collections)
}
