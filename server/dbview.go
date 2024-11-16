package main

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
	"go.etcd.io/bbolt"
)

func DbViewInit(dbview *echo.Group) {
	dbview.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cache-Control", "no-cache, no-store")
			return next(c)
		}
	})

	dbview.GET("/", dbViewCollections)
	dbview.GET("/:collection/", dbViewBuckets)
	dbview.GET("/:collection/:bucket/", dbViewBucket)
	// Create a catch-all route for /api/*
	dbview.Any("/*", func(c echo.Context) error {
		return c.String(http.StatusNotFound, "not found")
	})
}

func dbViewCollections(c echo.Context) error {
	var html string = "<h1>Collections</h1>"
	for _, c := range config.collections {
		html += "<a href=\"" + c.Name + "/\">" + c.Name + "</a><br>"
	}
	return c.HTML(http.StatusOK, html)
}

func dbViewBuckets(c echo.Context) error {
	collection, err := GetCollection(c.Param("collection"))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	Db := collection.cache.store.Bolt()
	var html string = "<h1>Viewing " + collection.Name + ": List buckets</h1>"
	html += "<a href=\"..\">&larr; Back</a><br><br>"
	Db.View(func(tx *bbolt.Tx) error {
		return tx.ForEach(func(name []byte, _ *bbolt.Bucket) error {
			sname := string(name)
			html += "<a href=\"" + sname + "/\">" + sname + "</a><br>"
			return nil
		})
	})

	return c.HTML(http.StatusOK, html)
}

func dbViewBucket(c echo.Context) error {
	collection, err := GetCollection(c.Param("collection"))
	bucket := c.Param("bucket")
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	Db := collection.cache.store.Bolt()

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

	Db.View(func(tx *bbolt.Tx) error {
		// Assume bucket exists and has keys
		b := tx.Bucket([]byte(bucket))

		if b != nil {
			html += "<table><tr><th>#</th><th>Key</th><th>Value</th></tr>"
			c := b.Cursor()
			count := 0
			for k, v := c.First(); k != nil; k, v = c.Next() {
				html += fmt.Sprintf("<tr><td>%d</td><td>%s</td><td>%s</td></tr>", count, string(k), string(v))

				if count > 2000 {
					break
				}
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
