import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Define a type for the slice state
interface AppState {
    theme: "system" | "light" | "dark";
    zoom: number;
}

// Define the initial state using that type
const initialState: AppState = {
    theme: "system",
    zoom: 150,
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
        toggleTheme: (state) => {
            state.theme = (state.theme == "light" ? "dark" : "light");
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
    toggleTheme,
} = appSettingsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectTheme = (state: RootState) => state.app.theme;
export const selectZoom = (state: RootState) => state.app.zoom;

export default appSettingsSlice.reducer;
