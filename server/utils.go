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
