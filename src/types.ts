
import { Image } from "react-photo-album";

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
    count: number;
}

export interface PhotoType {
    id: string;
    title: string;
    type: "image" | "video" | "live";
    subalbum: string;
    collection: CollectionType["name"];
    album: AlbumType["name"];
    favorite: PseudoAlbumType[];
    width: number;
    height: number;
    date: string;
    location: {
        present: boolean;
        lat: number;
        lng: number;
    }
    files: FileType[];
}

export interface FileType {
    type: "image" | "video";
    id: string;
    mime: string;
    width: number;
    height: number;
    date: string;
}

export type PhotoImageType = PhotoType & Image;

export const urls = {
    thumb: (photo: PhotoType) => `/api/collections/${photo.collection}/albums/${photo.album}/photos/${photo.id}/thumb`,
    file: (photo: PhotoType, file: FileType) => `/api/collections/${photo.collection}/albums/${photo.album}/photos/${photo.id}/files/${file.id}`,
}
