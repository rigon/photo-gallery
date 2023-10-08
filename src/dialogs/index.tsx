import React, { useState } from 'react'

import Lightbox from './Lightbox';
import NewAlbumDialog from './NewAlbum';
import PhotoInfoDialog from './PhotoInfo';

import { PhotoImageType, PhotoType } from '../types';

interface DialogContext {
    lightbox(photos: PhotoType[], selected: number): void;
    newAlbum(): void;
    info(photos: PhotoType[], selected: number): void;
}

const DialogContext = React.createContext<DialogContext>({
    lightbox: function (): void {},
    newAlbum: function (): void {},
    info: function (): void {},
});

interface DialogProviderProps {
    children?: React.ReactNode;
}

interface SelectedPhotos {
    photos: PhotoImageType[];
    selected: number;
}

const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [lightbox, setLightbox] = useState<SelectedPhotos | null>(null);
    const [newAlbum, setNewAlbum] = useState<boolean>(false);
    const [info, setInfo] = useState<SelectedPhotos | null>(null);

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
    
    return (
        <DialogContext.Provider value={{
                lightbox: openLightbox,
                newAlbum: openNewAlbum,
                info: openInfo,
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
