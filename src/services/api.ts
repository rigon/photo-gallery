import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType, PseudoAlbumType, AlbumType, PhotoType } from "../types";

interface QueryAlbums {
    collection?: string;
}

interface QueryAlbum {
    collection?: string;
    album?: string;
}

interface QuerySaveFavorite {
    collection: CollectionType;
    album: AlbumType["name"];
    photo: PhotoType["title"];
    photoIndex: number;
    saveToCollection: CollectionType;
    saveToAlbum: AlbumType["name"];
    favorite: boolean;
}

export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: [],
    endpoints: (builder) => ({
        getCollections: builder.query<CollectionType[], void>({
            query: () => "collections",
        }),
        getPseudoAlbums: builder.query<PseudoAlbumType[], void>({
            query: () => "pseudo",
        }),
        getAlbums: builder.query<AlbumType[], QueryAlbums>({
            query: ({ collection }) => `collection/${collection}/albums`,
        }),
        getAlbum: builder.query<AlbumType, QueryAlbum>({
            query: ({ collection, album }) => `collection/${collection}/album/${album}`,
        }),
        saveFavorite: builder.mutation<void, QuerySaveFavorite>({
            query: ({ collection, album, photo, photoIndex, ...saveTo }) => ({
                url: `/collection/${collection}/album/${album}/photo/${photo}/saveFavorite`,
                method: 'PUT',
                body: saveTo,
            }),
            async onQueryStarted({ collection, album, photoIndex, favorite }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    api.util.updateQueryData('getAlbum', {collection, album}, draft => {
                        // Optimistic Updates
                        draft.photos[photoIndex].favorite = favorite;
                    }));
                // Undo if the request fails
                queryFulfilled.catch(patchResult.undo);
            },
        }),
    }),
});

// Export hooks for usage in functional components
export const {
    useGetCollectionsQuery,
    useGetPseudoAlbumsQuery,
    useGetAlbumsQuery,
    useGetAlbumQuery,
    useSaveFavoriteMutation,
} = api;
