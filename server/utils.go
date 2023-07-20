package main

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path"
	"regexp"
	"strings"
)

// Taken from https://github.com/valyala/fasthttp/blob/0d0bbfee5a8dd12a82e442d3cbb11e56726dd06e/server.go#L1048
// SaveMultipartFile saves multipart file fh under the given filename path.
func SaveMultipartFile(fh *multipart.FileHeader, path string) (err error) {
	var (
		f  multipart.File
		ff *os.File
	)
	f, err = fh.Open()
	if err != nil {
		return
	}

	var ok bool
	if ff, ok = f.(*os.File); ok {
		// Windows can't rename files that are opened.
		if err = f.Close(); err != nil {
			return
		}

		// If renaming fails we try the normal copying method.
		// Renaming could fail if the files are on different devices.
		if os.Rename(ff.Name(), path) == nil {
			return nil
		}

		// Reopen f for the code below.
		if f, err = fh.Open(); err != nil {
			return
		}
	}

	defer func() {
		e := f.Close()
		if err == nil {
			err = e
		}
	}()

	if ff, err = os.Create(path); err != nil {
		return
	}
	defer func() {
		e := ff.Close()
		if err == nil {
			err = e
		}
	}()
	_, err = io.Copy(ff, f)
	return
}

/**
 * Source: https://elliotchance.medium.com/batch-a-channel-by-size-or-time-in-go-92fa3098f65
 */
func Batch[T comparable](values <-chan T, maxItems int) chan []T {
	var zero T // nil value for type T
	batches := make(chan []T)

	go func() {
		defer close(batches)

		for {
			var batch []T
			for value := range values {
				if value == zero { // nil will cause batch to flush
					break
				}

				batch = append(batch, value)
				if len(batch) == maxItems {
					break
				}
			}

			if len(batch) > 0 {
				batches <- batch
			}
		}
	}()

	return batches
}

func RenameFilename(filename string, renameIndex int) string {
	if renameIndex < 2 {
		return filename
	}

	// Compile the regular expression
	regExp := regexp.MustCompile(`\s\(\d+\)$`)

	ext := path.Ext(filename)
	// Extract name and remove anything like " (number)" from the end
	name := regExp.ReplaceAllString(strings.TrimSuffix(filename, ext), "")

	return fmt.Sprintf("%s (%d)%s", name, renameIndex, ext)
}
