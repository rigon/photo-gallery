package main

import (
	"fmt"
	"math"
)

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

func FormatBytes(bytes uint64) string {
	sizes := []string{"B", "KB", "MB", "GB", "TB", "PB", "EB"}
	idx := 0
	if bytes >= 1024 {
		idx = int(math.Floor(math.Log(float64(bytes)) / math.Log(1024)))
		if idx >= len(sizes) {
			idx = len(sizes) - 1
		}
	}
	size := float64(bytes) / math.Pow(1024, float64(idx))
	return fmt.Sprintf("%.1f%s", size, sizes[idx])
}
