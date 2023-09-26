import React, { useState } from 'react';

import DeleteDialog from './Delete';
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
}

const DialogContext = React.createContext<DialogContext>({
    lightbox: function (): void {},
    newAlbum: function (): void {},
    info: function (): void {},
    move: function (): void {},
    delete: function (): void {},
});

interface DialogProviderProps {
    children?: React.ReactNode;
}

interface SelectedPhotos {
    photos: PhotoImageType[];
    selected: number;
}

interface MoveDeleteData {
    collection: string;
    album: string;
    photos: PhotoImageType[];
}

const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [lightbox, setLightbox] = useState<SelectedPhotos | null>(null);
    const [newAlbum, setNewAlbum] = useState<boolean>(false);
    const [info, setInfo] = useState<SelectedPhotos | null>(null);
    const [move, setMove] = useState<MoveDeleteData | null>(null);
    const [del, setDelete] = useState<MoveDeleteData | null>(null);

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
    
    return (
        <DialogContext.Provider value={{
                lightbox: openLightbox,
                newAlbum: openNewAlbum,
                info: openInfo,
                move: openMove,
                delete: openDelete,
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
                collection={move?.collection || ""}
                album={move?.album || ""}
                photos={del?.photos || []}
                onClose={closeDelete} />
            
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
