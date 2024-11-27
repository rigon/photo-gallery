package main

import (
	"encoding/csv"
	"errors"
	"log"
	"runtime"
	"strconv"
	"strings"

	"github.com/zulucmd/zflag"
)

type CmdArgs struct {
	cacheThumbnails bool
	disableScan     bool
	fullScan        bool
	recreateCacheDB bool
	webdavDisabled  bool
	debug           bool
	thumbsPath      string
	collections     map[string]*Collection
	port            int
	host            string
	nWorkersInfo    int
	nWorkersThumb   int
}

func parseCollectionOptions(collectionOption string, index int, defaultThumbsPath string) (collection *Collection, err error) {
	collection = NewCollection()
	collection.Index = index
	collection.ThumbsPath = defaultThumbsPath
	collection.Hide = false
	collection.ReadOnly = false
	collection.RenameOnReplace = true

	reader := csv.NewReader(strings.NewReader(collectionOption))
	ss, err := reader.Read()
	if err != nil {
		return
	}
	for _, pair := range ss {
		kv := strings.SplitN(pair, "=", 2)
		if len(kv) != 2 {
			log.Printf("%s must be formatted as key=value\n", pair)
		}
		switch kv[0] {
		case "name":
			collection.Name = kv[1]
		case "path":
			collection.PhotosPath = kv[1]
		case "thumbs":
			collection.ThumbsPath = kv[1]
		case "db":
			collection.DbPath = kv[1]
		case "rename":
			collection.RenameOnReplace, err = strconv.ParseBool(kv[1])
			if err != nil {
				log.Println(err)
			}
		case "readonly":
			collection.ReadOnly, err = strconv.ParseBool(kv[1])
			if err != nil {
				return
			}
		case "hide":
			collection.Hide, err = strconv.ParseBool(kv[1])
			if err != nil {
				return
			}
		default:
			return collection, errors.New(kv[0] + " option is not valid")
		}
	}

	// Check required options
	if collection.Name == "" || collection.PhotosPath == "" || collection.ThumbsPath == "" {
		return nil, errors.New("name, path, thumbs options are required")
	}

	return
}

func ParseCmdArgs() (cmdArgs CmdArgs) {
	var collectionArgs []string
	zflag.StringSliceVar(&collectionArgs, "collection", collectionArgs, `Define a new collection. The order used will will be the same used in the interface.
Example: -c name=Photos,path=/photos,thumbs=/tmp
List of possible options:
  name           Name of the collection
  path           Location of the collection, i.e. path where the photos are stored
  thumbs         Path to store the thumbnails (by default is the path set with --thumbs)
  db             Path to cache DB, if a filename is provided it will be located in thumbnails directory
  hide=false     Hide the collection from the list (does not affect webdav)
  rename=true    Rename files instead of overwriting them
  readonly=false`, zflag.OptShorthand('c'))
	zflag.BoolVar(&cmdArgs.cacheThumbnails, "cache-thumbnails", true, "Generate missing thumbnails while scanning", zflag.OptAddNegative(), zflag.OptShorthand('b'))
	zflag.BoolVar(&cmdArgs.disableScan, "disable-scan", false, "Disable scans on start, by default will run a quick scan (cache info of new albums)")
	zflag.BoolVar(&cmdArgs.fullScan, "full-scan", false, "Perform a full scan on start (validates if all cached data is up to date)")
	zflag.BoolVar(&cmdArgs.recreateCacheDB, "recreate-cache", false, "Recreate cache DB, required after DB version upgrade", zflag.OptShorthand('r'))
	zflag.BoolVar(&cmdArgs.webdavDisabled, "disable-webdav", false, "Disable WebDAV")
	zflag.BoolVar(&cmdArgs.debug, "debug", false, "Enable debug")
	zflag.StringVar(&cmdArgs.thumbsPath, "thumbs", "", "Default path to store thumbnails", zflag.OptShorthand('t'))
	zflag.StringVar(&cmdArgs.host, "host", "localhost", "Specify a host", zflag.OptShorthand('H'))
	zflag.IntVar(&cmdArgs.port, "port", 3080, "Specify a port", zflag.OptShorthand('p'))
	zflag.IntVar(&cmdArgs.nWorkersInfo, "workers-info", 2, "Number of concurrent workers to extract photos info")
	zflag.IntVar(&cmdArgs.nWorkersThumb, "workers-thumb", runtime.NumCPU(), "Number of concurrent workers to generate thumbnails, by default number of CPUs")
	zflag.Parse()

	cmdArgs.collections = make(map[string]*Collection)
	for i, c := range collectionArgs {
		collection, err := parseCollectionOptions(c, i, cmdArgs.thumbsPath)
		if err != nil {
			log.Fatal(err)
		}
		cmdArgs.collections[collection.Name] = collection
	}
	return
}
