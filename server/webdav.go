package main

import (
	"context"
	"os"
	"path"
	"strconv"
	"strings"

	"golang.org/x/net/webdav"
)

type WDCollection AppConfig

func (c WDCollection) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	dir := webdav.Dir(c.PhotosPath)
	return dir.Mkdir(ctx, name, perm)
}
func (c WDCollection) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	dir := webdav.Dir(c.PhotosPath)

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

	return dir.OpenFile(ctx, name, flag, perm)
}
func (c WDCollection) RemoveAll(ctx context.Context, name string) error {
	dir := webdav.Dir(c.PhotosPath)
	return dir.RemoveAll(ctx, name)
}
func (c WDCollection) Rename(ctx context.Context, oldName, newName string) error {
	dir := webdav.Dir(c.PhotosPath)
	return dir.Rename(ctx, oldName, newName)
}
func (c WDCollection) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	dir := webdav.Dir(c.PhotosPath)
	x, e := dir.Stat(ctx, name)
	return x, e
}

func CreateWebDavFS(config AppConfig) webdav.FileSystem {
	// var fs webdav.FileSystem = webdav.NewMemFS()
	// for _, collecion := range app.Collections {
	// 	fs.Mkdir(nil, collecion.Name, 0660|os.ModeDir)
	// }

	// children := make([]webdav.Dir, len(app.Collections))

	// for i, collecion := range collections {
	// 	children[i] = webdav.Dir(collecion.PhotosPath)
	// }

	// make(map[string]*memFSNode)

	// return &memFS{
	// 	root: memFSNode{
	// 		children: make(map[string]*memFSNode),
	// 		mode:     0660 | os.ModeDir,
	// 		modTime:  time.Now(),
	// 	},
	// }
	// return WDCollection("")
	return WDCollection(config)
}
