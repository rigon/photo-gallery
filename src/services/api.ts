import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType, PseudoAlbumType, AlbumType, PhotoType } from "../types";
import { changeFavorite } from "./app";

export interface QueryAlbums {
    collection?: string;
}

export interface QueryAlbum {
    collection?: string;
    album?: string;
}

export interface QueryAddAlbum {
    collection: CollectionType;
    name: AlbumType["name"];
    type: "regular" | "pseudo";
}

export interface QuerySaveFavorite {
    collection: CollectionType;
    album: AlbumType["name"];
    photo: PhotoType["title"];
    photoIndex: number;
    saveTo: PseudoAlbumType;
    favorite: boolean;
}

export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['Album', 'Albums', 'Pseudo'],
    endpoints: (builder) => ({
        getCollections: builder.query<CollectionType[], void>({
            query: () => "collections",
        }),
        getPseudoAlbums: builder.query<PseudoAlbumType[], void>({
            query: () => "pseudos",
            providesTags: ['Pseudo'],
            async onCacheEntryAdded(arg, { dispatch, cacheDataLoaded }) {
                dispatch(changeFavorite((await cacheDataLoaded).data[0]));
            },
        }),
        getAlbums: builder.query<AlbumType[], QueryAlbums>({
            query: ({ collection }) => `collection/${collection}/albums`,
            providesTags: ['Albums'],
        }),
        getAlbum: builder.query<AlbumType, QueryAlbum>({
            query: ({ collection, album }) => `collection/${collection}/album/${album}`,
            providesTags: (result, error, arg) => [{ type: 'Album', id: `${arg.collection}-${arg.album}` }],
        }),
        addAlbum: builder.mutation<void, QueryAddAlbum>({
            query: ({ collection, ...body }) => ({
                url: `/collection/${collection}/album`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: [ 'Pseudo', 'Albums'],
        }),
        savePhotoToPseudo: builder.mutation<void, QuerySaveFavorite>({
            query: ({ collection, album, photo, saveTo }) => ({
                url: `/collection/${collection}/album/${album}/photo/${photo}/saveToPseudo`,
                method: 'PUT',
                body: saveTo,
            }),
            invalidatesTags: (result, error, arg) => [{ type: 'Album', id: `${arg.saveTo.collection}-${arg.saveTo.album}` }],
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
    useAddAlbumMutation,
    useSavePhotoToPseudoMutation,
} = api;
