import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// layouts
import Layout from './Layout';
import Gallery from './Gallery';

function Home() {
  return (<p>Select an album from the list on the left.</p>);
}

function App() {
  const [zoom, setZoom] = useState(180);

  const changeZoom = (multiplier) => {
    setZoom(zoom * multiplier);
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout changeZoom={changeZoom} />}>
          <Route index element={<Home />} />
          <Route path="/:collection" element={<Home />} />
          <Route path="/:collection/:album" element={<Gallery zoom={zoom} />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
