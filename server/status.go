package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.etcd.io/bbolt"
)

func ViewStatusInit(status *echo.Group) {
	status.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-cache, no-store")
			return next(c)
		}
	})

	status.GET("/", mainStatusView)
	// DB
	status.GET("/db/:collection/", dbViewBuckets)
	status.GET("/db/:collection/:bucket/", dbViewBucket)
	// Create a catch-all route for /api/*
	status.Any("/*", func(c echo.Context) error {
		return c.String(http.StatusNotFound, "not found")
	})
}
func mainStatusView(c echo.Context) error {
	var html string = "<h1>Photo Gallery status</h1>"

	// Workers
	html += "<h2>Workers active</h2>"
	html += "Thumbnails: " + strconv.Itoa(int(counter.thumbs)) + "<br>"
	html += "ExtractInfo: " + strconv.Itoa(int(counter.info)) + "<br>"

	// Cache DB
	html += "<h2>Cache DB</h2>"
	html += "<table><tr><th>Collection</th><th>To update</th><th>To delete</th></tr>"
	for _, c := range config.collections {
		html += "<tr>"
		html += "<td><a href=\"/status/db/" + c.Name + "/\">" + c.Name + "</a></td>"
		html += "<td style=\"text-align: center\">" + strconv.Itoa(len(c.cache.addInfoCh)) + "</td>"
		html += "<td style=\"text-align: center\">" + strconv.Itoa(len(c.cache.delInfoCh)) + "</td>"
		html += "</tr>"
	}
	html += "</table>"
	return c.HTML(http.StatusOK, html)
}

func dbViewBuckets(c echo.Context) error {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}
	var html string = "<h1>Cache DB for " + collection.Name + "</h1>"
	html += "<a href=\"../..\">&larr; Back</a>"

	html += "<h2>Items pending</h2>"
	html += "Batcher update: " + strconv.Itoa(len(collection.cache.addInfoCh)) + "<br>"
	html += "Batcher delete: " + strconv.Itoa(len(collection.cache.delInfoCh)) + "<br>"

	db := collection.cache.store.Bolt()

	html += "<h2>Buckets</h2>"
	db.View(func(tx *bbolt.Tx) error {
		return tx.ForEach(func(name []byte, _ *bbolt.Bucket) error {
			sname := string(name)
			html += "<a href=\"" + sname + "/\">" + sname + "</a><br>"
			return nil
		})
	})

	html += "<h2>Stats</h2>"
	json, _ := json.MarshalIndent(db.Stats(), "", "    ")
	html += "<pre>" + string(json) + "</pre>"

	return c.HTML(http.StatusOK, html)
}

func dbViewBucket(c echo.Context) error {
	collection, err := GetCollection(c.Param("collection"))
	bucket := c.Param("bucket")
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	db := collection.cache.store.Bolt()

	var html string = "<h1>Viewing " + collection.Name + ", bucket: " + bucket + "</h1>"
	html += "<a href=\"..\">&larr; Back</a><br><br>"
	html += `<style>
	table,
	th,
	td {
		border: 1px solid black;
		border-collapse: collapse;
		padding: 5px;
	}
	tr:nth-child(odd) {
		background-color: lightgray;
	}
	</style>`

	db.View(func(tx *bbolt.Tx) error {
		// Assume bucket exists and has keys
		b := tx.Bucket([]byte(bucket))

		if b != nil {
			html += "<table><tr><th>#</th><th>Key</th><th>Value</th></tr>"
			c := b.Cursor()

			count := 0
			for k, v := c.First(); k != nil; k, v = c.Next() {
				if count > 2000 {
					break
				}
				html += fmt.Sprintf("<tr><td>%d</td><td>%s</td><td>%s</td></tr>", count, string(k), string(v))
				count++
			}
			html += "</table>"

			if count > 2000 {
				html += "<b>More than 2000 records found, stopping..."
			}
		} else {
			html += "no such bucket available"
		}

		return nil
	})

	return c.HTML(http.StatusOK, html)
}
