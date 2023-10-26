import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType, PseudoAlbumType, AlbumType, PhotoType, MoveConflictMode } from "../types";
import { changeFavorite } from "./app";

export interface ResponseError {
    message: string;
}

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

export interface QueryMovePhotos {
    collection: CollectionType["name"];
    album: AlbumType["name"];
    target: {
        mode: MoveConflictMode;
        collection: CollectionType["name"];
        album: AlbumType["name"];
        photos: PhotoType["title"][];
    }
}

export interface ResponseMovePhotos {
    moved_photos: number;
    moved_files: number;
    skipped: number;
    renamed: number;
}

export interface QueryDeletePhotos {
    collection: CollectionType["name"];
    album: AlbumType["name"];
    target: {
        photos: PhotoType["title"][];
    }
}

export interface QuerySaveFavorite {
    collection: CollectionType["name"];
    album: AlbumType["name"];
    favorite: boolean;
    photoIndexes: number[];
    saveData: {
        collection: CollectionType["name"];
        album: AlbumType["name"];
        photos: PhotoType["id"][];
    }
}

export interface ResponseDuplicates {
    total: number;
	countDup: number;
    countUniq: number;
    duplicates: {
        photo: PhotoType;
        found: {
            collection: string;
            album: string;
            photo: string;
            files: string[];
            partial: boolean;
            samealbum: boolean;
        }[];
    }[];
    uniq: PhotoType[];
}

const albumId = (arg: { collection: string, album: string }) => arg.collection + ":" + arg.album;

export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
    tagTypes: ['Album', 'Albums', 'Pseudo'],
    endpoints: (builder) => ({
        getCollections: builder.query<CollectionType[], void>({
            query: () => "/collections",
        }),
        getPseudoAlbums: builder.query<PseudoAlbumType[], void>({
            query: () => "/pseudos",
            providesTags: ['Pseudo'],
            async onCacheEntryAdded(_arg, { dispatch, cacheDataLoaded }) {
                dispatch(changeFavorite((await cacheDataLoaded).data[0]));
            },
        }),
        getAlbums: builder.query<AlbumType[], QueryAlbums>({
            query: ({ collection }) => `/collections/${collection}/albums`,
            providesTags: ['Albums'],
        }),
        getAlbum: builder.query<AlbumType, QueryAlbum>({
            query: ({ collection, album }) => `/collections/${collection}/albums/${album}`,
            providesTags: (_result, _error, arg) => [{ type: 'Album', id: albumId(arg) }],
        }),
        addAlbum: builder.mutation<void, QueryAddAlbum>({
            query: ({ collection, ...body }) => ({
                url: `/collections/${collection}/albums`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: [ 'Pseudo', 'Albums'],
        }),
        deleteAlbum: builder.mutation<void, QueryAlbum>({
            query: ({ collection, album }) => ({
                url: `/collections/${collection}/albums/${album}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, arg) => ['Pseudo', 'Albums', { type: 'Album', id: albumId(arg) }],
        }),
        duplicatedPhotos: builder.query<ResponseDuplicates, QueryAlbum>({
            query: ({ collection, album }) => `/collections/${collection}/albums/${album}/duplicates`
        }),
        movePhotos: builder.mutation<ResponseMovePhotos, QueryMovePhotos>({
            query: ({ collection, album, target }) => ({
                url: `/collections/${collection}/albums/${album}/photos/move`,
                method: 'PUT',
                body: target,
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Album', id: albumId(arg) },
                { type: 'Album', id: albumId(arg.target) }
            ],
        }),
        deletePhotos: builder.mutation<void, QueryDeletePhotos>({
            query: ({ collection, album, target }) => ({
                url: `/collections/${collection}/albums/${album}/photos`,
                method: 'DELETE',
                body: target,
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Album', id: albumId(arg) },
            ],
        }),
        getPhotoInfo: builder.query<any[], PhotoType>({
            query: ({collection, album, id }) => `/collections/${collection}/albums/${album}/photos/${id}/info`,
        }),
        savePhotoToPseudo: builder.mutation<void, QuerySaveFavorite>({
            query: ({ collection, album, favorite, saveData }) => ({
                url: `/collections/${collection}/albums/${album}/pseudos`,
                method: favorite ? 'PUT' : 'DELETE',
                body: saveData,
            }),
            invalidatesTags: (_result, _error, arg) => [{ type: 'Album', id: albumId(arg) }],
            async onQueryStarted({ collection, album, saveData, photoIndexes, favorite }, { dispatch, queryFulfilled }) {
                const query: QueryAlbum = { collection: saveData.collection, album: saveData.album };
                const patchResult = dispatch(
                    api.util.updateQueryData('getAlbum', query, draft => {
                        // Optimistic Updates
                        photoIndexes.forEach(i => {
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
    useDeleteAlbumMutation,
    useDuplicatedPhotosQuery,
    useMovePhotosMutation,
    useDeletePhotosMutation,
    useGetPhotoInfoQuery,
    useSavePhotoToPseudoMutation,
} = api;

export default api;
