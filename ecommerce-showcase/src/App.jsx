import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Agent from './pages/Agent';

// We leave one placeholder for the Dedicated Agent Hub, as that requires complex RAG logic
const Placeholder = ({ title }) => (
  <div className="h-full flex flex-col items-center justify-center text-gray-400">
    <h1 className="text-3xl font-bold mb-2">{title}</h1>
    <p>Module UI architecture pending.</p>
  </div>
);

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/agent" element={<Agent/>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;