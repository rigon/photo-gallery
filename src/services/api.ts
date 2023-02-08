import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { CollectionType } from "../types";

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: [],
  endpoints: (builder) => ({
    getCollections: builder.query<CollectionType[], string>({
      query: () => "collections",
    }),
  }),
});

// Export hooks for usage in functional components
export const { useGetCollectionsQuery } = api;
