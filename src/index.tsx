import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
// local imports
import App from './App';
import { setupStore } from './store'

const store = setupStore();

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode >
);
