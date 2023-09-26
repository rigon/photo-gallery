import React, { useState } from 'react';

import DeleteAlbumDialog from './DeleteAlbum';
import DeleteDialog from './Delete';
import DuplicatesDialog from './Duplicates';
import Lightbox from './Lightbox';
import MoveDialog from './Move';
import NewAlbumDialog from './NewAlbum';
import PhotoInfoDialog from './PhotoInfo';

import { PhotoImageType, PhotoType } from '../types';

interface DialogContext {
    lightbox(photos: PhotoType[], selected: number): void;
    newAlbum(): void;
    info(photos: PhotoType[], selected: number): void;
    move(collection: string, album: string, photos: PhotoImageType[]): void;
    delete(collection: string, album: string, photos: PhotoImageType[]): void;
    deleteAlbum(collection: string, album: string): void;
    duplicates(collection: string, album: string): void;
}

const DialogContext = React.createContext<DialogContext>({
    lightbox: function (): void {},
    newAlbum: function (): void {},
    info: function (): void {},
    move: function (): void {},
    delete: function (): void {},
    deleteAlbum: function (): void {},
    duplicates: function (): void {},
});

interface DialogProviderProps {
    children?: React.ReactNode;
}

interface CollectionAlbum {
    collection: string;
    album: string;
}

interface CollectionAlbumPhotos {
    collection: string;
    album: string;
    photos: PhotoImageType[];
}

interface SelectedPhotos {
    photos: PhotoImageType[];
    selected: number;
}

interface DuplicatesData {
    collection: string;
    album: string;
}

const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [lightbox, setLightbox] = useState<SelectedPhotos | null>(null);
    const [newAlbum, setNewAlbum] = useState<boolean>(false);
    const [info, setInfo] = useState<SelectedPhotos | null>(null);
    const [move, setMove] = useState<CollectionAlbumPhotos | null>(null);
    const [del, setDelete] = useState<CollectionAlbumPhotos | null>(null);
    const [deleteAlbum, setDeleteAlbum] = useState<CollectionAlbum | null>(null);
    const [duplicates, setDuplicates] = useState<DuplicatesData | null>(null);

    // Lightbox
    const openLightbox = (photos: PhotoImageType[], selected: number) => {
        setLightbox({photos, selected});
    }
    const closeLightbox = () => {
        setLightbox(null);
    }
    // New Album
    const openNewAlbum = () => {
        setNewAlbum(true);
    }
    const closeNewAlbum = () => {
        setNewAlbum(false);
    }
    // Info
    const openInfo = (photos: PhotoImageType[], selected: number) => {
        setInfo({photos, selected});
    }
    const closeInfo = () => {
        setInfo(null);
    }
    // Move
    const openMove = (collection: string, album: string, photos: PhotoImageType[]) => {
        setMove({collection, album, photos});
    }
    const closeMove = () => {
        setMove(null);
    }
    // Delete
    const openDelete = (collection: string, album: string, photos: PhotoImageType[]) => {
        setDelete({collection, album, photos});
    }
    const closeDelete = () => {
        setDelete(null);
    }
    // Delete Album
    const openDeleteAlbum = (collection: string, album: string) => {
        setDeleteAlbum({collection, album});
    }
    const closeDeleteAlbum = () => {
        setDeleteAlbum(null);
    }
    // Duplicates
    const openDuplicates = (collection: string, album: string) => {
        setDuplicates({collection, album});
    }
    const closeDuplicates = () => {
        setDuplicates(null);
    }
    
    return (
        <DialogContext.Provider value={{
                lightbox: openLightbox,
                newAlbum: openNewAlbum,
                info: openInfo,
                move: openMove,
                delete: openDelete,
                deleteAlbum: openDeleteAlbum,
                duplicates: openDuplicates,
            }}>
            
            { children }

            <Lightbox
                open={lightbox !== null}
                photos={lightbox?.photos || []}
                selected={lightbox?.selected || 0}
                onClose={closeLightbox} />
            
            <NewAlbumDialog
                open={newAlbum}
                onClose={closeNewAlbum} />

            <PhotoInfoDialog
                open={info !== null}
                photos={info?.photos || []}
                selected={info?.selected || 0}
                onClose={closeInfo} />
            
            <MoveDialog
                open={move !== null}
                collection={move?.collection || ""}
                album={move?.album || ""}
                photos={move?.photos || []}
                onClose={closeMove} />
            
            <DeleteDialog
                open={del !== null}
                collection={del?.collection || ""}
                album={del?.album || ""}
                photos={del?.photos || []}
                onClose={closeDelete} />

            <DeleteAlbumDialog
                open={deleteAlbum !== null}
                collection={deleteAlbum?.collection || ""}
                album={deleteAlbum?.album || ""}
                onClose={closeDeleteAlbum} />

            <DuplicatesDialog
                open={duplicates !== null}
                collection={duplicates?.collection || ""}
                album={duplicates?.album || ""}
                onClose={closeDuplicates} />
            
        </DialogContext.Provider>
    );
}

const useDialog = () => {
    const context = React.useContext(DialogContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a DialogProvider');
    }

    return context;
}

export { DialogProvider, useDialog };
