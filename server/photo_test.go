package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"hash/fnv"
	"strconv"
	"strings"
	"testing"
	"time"

	"golang.org/x/exp/rand"
)

func TestBenchmarkHashesSHA256(t *testing.T) {
	name := "somerandomname"
	start := time.Now()
	for i := 0; i < 1_000_000; i++ {
		hash := sha256.Sum256([]byte(name))
		name = hex.EncodeToString(hash[:])
	}
	t.Log("Total time (ms):", time.Since(start).Milliseconds())
}

func TestBenchmarkHashesFNV(t *testing.T) {
	name := "somerandomname"
	start := time.Now()
	for i := 0; i < 1_000_000; i++ {
		hasher := fnv.New64a()
		hasher.Write([]byte(name))
		hash := strconv.FormatUint(hasher.Sum64(), 36)  // Can produce hashes of up to 13 chars
		name = hash + strings.Repeat("0", 13-len(hash)) // Fill smaller hashes with "0"
	}
	t.Log("Total time (ms):", time.Since(start).Milliseconds())
}

func randSeq(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-!@#$()=+[]"
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}
func TestHashesDistribution(t *testing.T) {
	rand.Seed(uint64(time.Now().UnixNano()))
	collection := &Collection{
		Name:       "X",
		ThumbsPath: "/"}

	check := []int{len("/X-thumbs/"), len("/X-thumbs/?"), len("/X-thumbs/??/"), len("/X-thumbs/??/?")}
	count := [][]int{make([]int, 36), make([]int, 36), make([]int, 36), make([]int, 36)}
	for i := 0; i < 1_000_000; { // Gen albums
		album := randSeq(rand.Intn(30) + 1)
		n := rand.Intn(10_000) + 10
		for j := 0; j < n; j++ { // Gen photos
			i++
			name := randSeq(rand.Intn(30) + 1)

			photo := Photo{
				Id:    name,
				Album: album,
			}
			h := photo.ThumbnailPath(collection)

			for k := 0; k < len(check); k++ {
				c := h[check[k]]
				x := c - '0'
				if c >= 'a' && c <= 'z' {
					x = c - 'a' + 10
				}
				count[k][x]++
			}
		}
	}
	for k := 0; k < len(check); k++ {
		fmt.Printf("ch #%d: %v\n\n", k, count[k])
	}
}
