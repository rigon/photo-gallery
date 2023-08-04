package main

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
