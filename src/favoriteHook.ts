import { useSelector } from 'react-redux';
import { selectFavorite } from "./services/app";
import { PhotoType, PseudoAlbumType } from './types';

const useFavorite = () => {
    const favorite = useSelector(selectFavorite);

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

    return {
        get: () => favorite,
        list: (favoriteList: PseudoAlbumType[]) => favoriteStatus(favoriteList),
        photo: (photo: PhotoType) => favoriteStatus(photo.favorite),
    };
}

export default useFavorite;
