import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// layouts
import Layout from './Layout';
import GalleryApp from './GalleryApp';

function Home() {
  return (<p>Select an album from the list on the left.</p>);
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/:album" element={<GalleryApp />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
