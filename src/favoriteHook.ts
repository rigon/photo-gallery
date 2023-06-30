import { useSelector } from 'react-redux';
import { selectFavorite } from "./services/app";
import { PhotoType } from './types';

const useFavorite = () => {
    const favorite = useSelector(selectFavorite);
    const favoriteId = favorite ? favorite.collection + ":" + favorite.album : "";

    const favoriteStatus = (favoriteList?: string[]) => {
        const list = favoriteList && Array.isArray(favoriteList) ? favoriteList : [];
        const isFavorite = list.length > 0;
        const isFavoriteThis = isFavorite && list.indexOf(favoriteId) >= 0;
        const isFavoriteAnother = isFavorite && !isFavoriteThis;

        return {
            isFavorite,         // Photo is favorite
            isFavoriteThis,     // Photo is favorite in selectedFavorite
            isFavoriteAnother,  // Photo is favorite but not in selectedFavorite
        };
    };

    return {
        get: () => favorite,
        list: (favoriteList?: string[]) => favoriteStatus(favoriteList),
        photo: (photo: PhotoType) => favoriteStatus(photo.favorite),
    };
}

export default useFavorite;
