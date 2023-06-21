
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
    /** Name of the album */
    name: string;
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
    favorite: boolean;
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
