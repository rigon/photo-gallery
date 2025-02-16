import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { PseudoAlbumType } from '../types';

// Define a type for the slice state
interface AppState {
    theme: "system" | "light" | "dark";
    zoom: number;
    favorite: PseudoAlbumType;
}

// Define the initial state using that type
const initialState: AppState = {
    theme: "system",
    zoom: 200,
    favorite: {
        collection: '',
        album: ''
    },
}

export const appSettingsSlice = createSlice({
    name: 'app',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        increaseZoom: (state) => {
            state.zoom += 10;
        },
        decreaseZoom: (state) => {
            state.zoom -= 10;
        },
        changeTheme: (state, action: PayloadAction<AppState['theme']>) => {
            state.theme = action.payload;
        },
        changeFavorite: (state, action: PayloadAction<PseudoAlbumType>) => {
            state.favorite = action.payload;
        },
    },
});

export const appSettings = configureStore({
    reducer: {
        ui: appSettingsSlice.reducer,
    }
});

export const {
    increaseZoom,
    decreaseZoom,
    changeTheme,
    changeFavorite,
} = appSettingsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectTheme = (state: RootState) => state.app.theme;
export const selectZoom = (state: RootState) => state.app.zoom;
export const selectFavorite = (state: RootState) => state.app.favorite;

export default appSettingsSlice.reducer;
