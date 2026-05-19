/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EventView from './pages/EventView';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/join/:slug" element={<EventView />} />
          <Route path="/:slug" element={<EventView />} />
        </Routes>
      </div>
    </Router>
  );
}
