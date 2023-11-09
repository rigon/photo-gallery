import { useSelector } from 'react-redux';
import { useParams } from "react-router-dom";

import { selectFavorite } from "./services/app";
import { QuerySaveFavorite, useSavePhotoToPseudoMutation } from './services/api';
import { PhotoImageType, PhotoType, PseudoAlbumType } from './types';
import useNotification from "./Notification";

const useFavorite = () => {
    const favorite = useSelector(selectFavorite);
    const { collection, album } = useParams();
    const [saveFavorite] = useSavePhotoToPseudoMutation();
    const { infoNotification, errorNotification } = useNotification();

    const favoriteStatus = (favorites: PseudoAlbumType[]) => {
        const list = Array.isArray(favorites) ? favorites : [];
        const isFavorite = list.length > 0;
        const isFavoriteThis = isFavorite && list.some(
            entry => entry.collection === favorite.collection && entry.album === favorite.album);
        const isFavoriteAnother = isFavorite && !isFavoriteThis;

        return {
            isFavorite,         // Photo is favorite
            isFavoriteThis,     // Photo is favorite in selectedFavorite
            isFavoriteAnother,  // Photo is favorite but not in selectedFavorite
        };
    };

    const toggle = async (photos: PhotoImageType[], index: number) => {
        if (collection === undefined || album === undefined || collection === "" || album === "") {
            errorNotification("Select a collection and an album from the left menu.");
            return;
        }

        const indexes = [index];
        const isFavorite = !(favoriteStatus(photos[index].favorite).isFavoriteThis);

        const saveData = {
            collection,
            album,
            photos: indexes.map(i => photos[i].id)
        };

        await save(saveData, indexes, isFavorite);
    }

    const save = async (saveData: QuerySaveFavorite["saveData"], photoIndexes: number[], isFavorite: boolean) => {
        if (favorite === undefined) {
            errorNotification("No favorite album is selected. Select first from the top toolbar.");
            return;
        }
        const targetCollection = favorite.collection;
        const targetAlbum = favorite.album;

        try {
            await saveFavorite({
                collection: targetCollection,
                album: targetAlbum,
                favorite: isFavorite,
                saveData,
                photoIndexes,
            }).unwrap();
            infoNotification(isFavorite ?
                `Photo added as favorite to ${targetAlbum}` :
                `Photo removed as favorite from ${targetAlbum}`);
        }
        catch (error) {
            errorNotification(`Could not set the photo as favorite in ${targetAlbum}!`);
            console.log(error);
        }
    }

    return {
        get: () => favorite,
        list: (favoriteList: PseudoAlbumType[]) => favoriteStatus(favoriteList),
        photo: (photo: PhotoType) => favoriteStatus(photo.favorite),
        toggle,
        save,
    };
}

export default useFavorite;
