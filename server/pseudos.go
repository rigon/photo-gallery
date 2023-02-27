package main

type PseudoAlbum struct {
	Collection string `json:"collection"`
	Name       string `json:"album"`
}

func GetPseudoAlbums(collections map[string]*Collection) []PseudoAlbum {
	pseudos := make([]PseudoAlbum, 0)

	for name, collection := range collections {
		albums, _ := ListAlbums(*collection)
		for _, album := range albums {
			if album.IsPseudo {
				pseudos = append(pseudos, PseudoAlbum{Collection: name, Name: album.Name})
			}
		}
	}

	return pseudos
}
