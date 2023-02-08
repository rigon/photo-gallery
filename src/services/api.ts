import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType, AlbumType,  } from "../types";

interface QueryAlbums {
  collection?: string;
}
interface QueryAlbum {
  collection?: string;
  album?: string;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: [],
  endpoints: (builder) => ({
    getCollections: builder.query<CollectionType[], void>({
      query: () => "collections",
    }),
    getAlbums: builder.query<AlbumType[], QueryAlbums>({
      query: ({collection}) => `collection/${collection}/albums`,
    }),
    getAlbum: builder.query<AlbumType, QueryAlbum>({
      query: ({collection, album}) => `collection/${collection}/album/${album}`,
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetCollectionsQuery,
  useGetAlbumsQuery,
  useGetAlbumQuery
} = api;
