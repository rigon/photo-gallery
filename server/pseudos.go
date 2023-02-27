package main

type PseudoAlbum struct {
	Collection string `json:"collection"`
	Name       string `json:"album"`
}

func GetPseudoAlbums(collections map[string]*Collection) []PseudoAlbum {
	pseudos := make([]PseudoAlbum, 7)

	pseudos[0] = PseudoAlbum{Collection: "Photos", Name: "Favorite 1"}
	pseudos[1] = PseudoAlbum{Collection: "Photos", Name: "Favorite 2"}
	pseudos[2] = PseudoAlbum{Collection: "Photos", Name: "Favorite 3"}
	pseudos[3] = PseudoAlbum{Collection: "Photos", Name: "Favorite 4"}
	pseudos[4] = PseudoAlbum{Collection: "Photos", Name: "Favorite 5"}
	pseudos[5] = PseudoAlbum{Collection: "Photos", Name: "Favorite 6"}
	pseudos[6] = PseudoAlbum{Collection: "Photos", Name: "Favorite 7"}

	return pseudos
}
