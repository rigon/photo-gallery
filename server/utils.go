package main

import (
	"crypto/tls"
	"log"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/acme/autocert"
)

func mergeWithoutDuplicates[T comparable](slices ...[]T) []T {
	allKeys := make(map[T]bool)
	list := []T{}
	for _, slice := range slices {
		for _, item := range slice {
			if _, value := allKeys[item]; !value {
				allKeys[item] = true
				list = append(list, item)
			}
		}
	}
	return list
}

func initServerWithAutoCert(app *fiber.App, domains []string, address string) {
	// Let’s Encrypt has rate limits: https://letsencrypt.org/docs/rate-limits/
	// It's recommended to use it's staging environment to test the code:
	// https://letsencrypt.org/docs/staging-environment/

	// Certificate manager
	m := &autocert.Manager{
		Prompt: autocert.AcceptTOS,
		// Replace with your domain
		HostPolicy: autocert.HostWhitelist(domains...),
		// Folder to store the certificates
		Cache: autocert.DirCache("./certs"),
	}

	// TLS Config
	cfg := &tls.Config{
		// Get Certificate from Let's Encrypt
		GetCertificate: m.GetCertificate,
		// By default NextProtos contains the "h2"
		// This has to be removed since Fasthttp does not support HTTP/2
		// Or it will cause a flood of PRI method logs
		// http://webconcepts.info/concepts/http-method/PRI
		NextProtos: []string{
			"http/1.1", "acme-tls/1",
		},
	}
	ln, err := tls.Listen("tcp", address, cfg)

	if err != nil {
		panic(err)
	}

	// Start server
	log.Fatal(app.Listener(ln))
}
