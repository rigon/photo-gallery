
export interface CollectionType {
    name: string;
    storage: CollectionStorageType;
}

export interface CollectionStorageType {
    size: string;
    free: string;
    used: string;
    percentage: number;
}

export interface PseudoAlbumType {
    collection: CollectionType["name"];
    album: AlbumType["name"];
}

export interface AlbumType {
    name: string;   // Name of the album
    photos: PhotoType[];
    subalbums: string[];
    pseudo: boolean;
}

export interface PhotoType {
    id: string;
    src: string;    // thumbnail
    title: string;
    type: "image" | "video" | "live";
    subalbum: string;
    favorite: PseudoAlbumType[];
    width: number;
    height: number;
    date: string;
    info: string;
    files: FileType[];
}

export interface FileType {
    type: "image" | "video";
    mime: string;
    url: string;
    width: number;
    height: number;
}
