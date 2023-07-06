import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType, PseudoAlbumType, AlbumType, PhotoType } from "../types";
import { changeFavorite } from "./app";

export interface QueryAlbums {
    collection?: string;
}

export interface QueryAlbum {
    collection: string;
    album: string;
}

export interface QueryAddAlbum {
    collection: CollectionType["name"];
    name: AlbumType["name"];
    type: "regular" | "pseudo";
}

export interface QueryPhoto {
    collection?: string;
    album?: string;
    photo?: string;
}

export interface QuerySaveFavorite {
    collection: CollectionType["name"];
    album: AlbumType["name"];
    favorite: boolean;
    photoIndex: number[];
    saveData: {
        collection: CollectionType["name"];
        album: AlbumType["name"];
        photos: PhotoType["id"][];
    }
}

const albumId = (arg: { collection: string, album: string }) => arg.collection + ":" + arg.album;

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
            async onCacheEntryAdded(_arg, { dispatch, cacheDataLoaded }) {
                dispatch(changeFavorite((await cacheDataLoaded).data[0]));
            },
        }),
        getAlbums: builder.query<AlbumType[], QueryAlbums>({
            query: ({ collection }) => `/collection/${collection}/albums`,
            providesTags: ['Albums'],
        }),
        getAlbum: builder.query<AlbumType, QueryAlbum>({
            query: ({ collection, album }) => `/collection/${collection}/album/${album}`,
            providesTags: (_result, _error, arg) => [{ type: 'Album', id: albumId(arg) }],
        }),
        addAlbum: builder.mutation<void, QueryAddAlbum>({
            query: ({ collection, ...body }) => ({
                url: `/collection/${collection}/albums`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: [ 'Pseudo', 'Albums'],
        }),
        getPhotoInfo: builder.query<any, string>({
            query: (infoUrl) => infoUrl,
        }),
        savePhotoToPseudo: builder.mutation<void, QuerySaveFavorite>({
            query: ({ collection, album, favorite, saveData }) => ({
                url: `/collection/${collection}/album/${album}/pseudo`,
                method: favorite ? 'PUT' : 'DELETE',
                body: saveData,
            }),
            invalidatesTags: (_result, _error, arg) => [{ type: 'Album', id: albumId(arg) }],
            async onQueryStarted({ collection, album, saveData, photoIndex, favorite }, { dispatch, queryFulfilled }) {
                const query: QueryAlbum = { collection: saveData.collection, album: saveData.album };
                const patchResult = dispatch(
                    api.util.updateQueryData('getAlbum', query, draft => {
                        // Optimistic Updates
                        photoIndex.forEach(i => {
                            if(!draft.photos[i].favorite)
                                draft.photos[i].favorite = [];
                            
                            const target: PseudoAlbumType = {collection, album};
                            const index = draft.photos[i].favorite.findIndex(
                                entry => entry.collection === target.collection && entry.album === target.album);
                            if(favorite && index < 0)   // Add if not in the favorites list
                                draft.photos[i].favorite.push(target);
                            if(!favorite && index >= 0) // Remove if in the favorites list
                                draft.photos[i].favorite.splice(index, 1);
                        });
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
    useGetPhotoInfoQuery,
    useSavePhotoToPseudoMutation,
} = api;
