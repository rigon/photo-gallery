import React, { useState } from 'react'

import { PhotoImageType, PhotoType } from '../types';
import NewAlbumDialog from './NewAlbum';
import PhotoInfoDialog from './PhotoInfo';

interface DialogContext {
    newAlbum(): void;
    info(photos: PhotoType[], selected: number): void;
}

const DialogContext = React.createContext<DialogContext>({
    newAlbum: function (): void {},
    info: function (): void {},
});

interface DialogProviderProps {
    children?: React.ReactNode;
}

interface InfoData {
    photos: PhotoType[];
    selected: number;
}

const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
    const [newAlbum, setNewAlbum] = useState<boolean>(false);
    const [info, setInfo] = useState<InfoData | null>(null);

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
                newAlbum: openNewAlbum,
                info: openInfo,
            }}>
            
            { children }

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
