import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// layouts
import Layout from './Layout';

function Home() {
  return (<p>Feels lonely here</p>);
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:album" element={<Layout />} />
      </Routes>
    </Router>
  );
}

export default App;
