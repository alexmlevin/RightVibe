import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import NewProject from './pages/NewProject';
import ProducerView from './pages/ProducerView';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/new" element={<NewProject />} />
        <Route path="/project/:id" element={<ProducerView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
