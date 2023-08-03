import { useSelector } from 'react-redux';
import { useParams } from "react-router-dom";

import { selectFavorite } from "./services/app";
import { useSavePhotoToPseudoMutation } from './services/api';
import { PhotoImageType, PhotoType, PseudoAlbumType } from './types';
import useNotification from "./Notification";

const useFavorite = () => {
    const favorite = useSelector(selectFavorite);
    const { collection, album } = useParams();
    const [saveFavorite] = useSavePhotoToPseudoMutation();
    const { infoNotification, errorNotification } = useNotification();

    const favoriteStatus = (favorites: PseudoAlbumType[]) => {
        const list = favorites && Array.isArray(favorites) ? favorites : [];
        const isFavorite = list.length > 0;
        const isFavoriteThis = isFavorite && list.find(
            entry => entry.collection === favorite.collection && entry.album === favorite.album);
        const isFavoriteAnother = isFavorite && !isFavoriteThis;

        return {
            isFavorite,         // Photo is favorite
            isFavoriteThis,     // Photo is favorite in selectedFavorite
            isFavoriteAnother,  // Photo is favorite but not in selectedFavorite
        };
    };

    const toggleFavorite = async (index: number, photos: PhotoImageType[]) => {
        if (favorite === undefined) {
            errorNotification("No favorite album is selected. Select first from the top toolbar.");
            return;
        }
        if (collection === undefined || album === undefined || collection === "" ||
            album === "" || index < 0 || index >= photos.length) {
            errorNotification("Select a collection and an album from the left menu.");
            return;
        }

        const indexes = [index];
        const isFavorite = !(favoriteStatus(photos[index].favorite).isFavoriteThis);
        try {
            await saveFavorite({
                collection: favorite.collection,
                album: favorite.album,
                favorite: isFavorite,
                saveData: {
                    collection,
                    album,
                    photos: indexes.map(i => photos[i].id),
                },
                photoIndexes: indexes,
            }).unwrap();
            infoNotification(isFavorite ?
                `Photo added as favorite to ${favorite.album}` :
                `Photo removed as favorite from ${favorite.album}`);
        }
        catch (error) {
            errorNotification(`Could not set the photo as favorite in ${favorite.album}!`);
            console.log(error);
        }
    }

    return {
        get: () => favorite,
        list: (favoriteList: PseudoAlbumType[]) => favoriteStatus(favoriteList),
        photo: (photo: PhotoType) => favoriteStatus(photo.favorite),
        toggle: toggleFavorite,
    };
}

export default useFavorite;
