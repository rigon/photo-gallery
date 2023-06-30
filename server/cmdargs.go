package main

import (
	"encoding/csv"
	"errors"
	"log"
	"strconv"
	"strings"

	"github.com/spf13/pflag"
)

type CmdArgs struct {
	cacheThumbnails bool
	recreateCacheDB bool
	webdavDisabled  bool
	collections     map[string]*Collection
	port            int
	host            string
	autoHttps       []string
}

func parseCollectionOptions(collectionOption string, defaultIndex int) (collection *Collection, err error) {
	collection = new(Collection)
	collection.Index = defaultIndex
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
		case "index":
			collection.Index, err = strconv.Atoi(kv[1])
			if err != nil {
				return
			}
		case "name":
			collection.Name = kv[1]
		case "path":
			collection.PhotosPath = kv[1]
		case "thumbs":
			collection.ThumbsPath = kv[1]
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
	return
}

func ParseCmdArgs() (cmdArgs CmdArgs) {
	var collectionArgs []string
	pflag.StringArrayVarP(&collectionArgs, "collection", "c", collectionArgs, `Specify a new collection. Example name=Photos,path=/photos,thumbs=/tmp
List of possible options:
index          Position in the collection list
name           Name of the collection
path           Path to load the albums from
thumbs         Path to store the thumbnails
hide=false     Hide the collection from the list (does not affect webdav)
rename=true    Rename files instead of overwriting them
readonly=false`)
	pflag.BoolVarP(&cmdArgs.cacheThumbnails, "cache-thumbnails", "b", false, "Generate thumbnails in background when the application starts")
	pflag.BoolVarP(&cmdArgs.recreateCacheDB, "recreate-cache", "r", false, "Recreate cache DB, required after DB version upgrade")
	pflag.BoolVar(&cmdArgs.webdavDisabled, "disable-webdav", false, "Disable WebDAV")
	pflag.StringVar(&cmdArgs.host, "host", "localhost", "Specify a host")
	pflag.IntVarP(&cmdArgs.port, "port", "p", 3080, "Specify a port")
	pflag.StringSliceVar(&cmdArgs.autoHttps, "auto-https", []string{}, "Specify domain list for HTTPS, ACME Autocert is used to create a Let's Encrypt certificate")
	pflag.Parse()

	cmdArgs.collections = make(map[string]*Collection)
	for i, c := range collectionArgs {
		collection, err := parseCollectionOptions(c, i)
		if err != nil {
			log.Fatal(err)
		}
		cmdArgs.collections[collection.Name] = collection
	}
	return
}
