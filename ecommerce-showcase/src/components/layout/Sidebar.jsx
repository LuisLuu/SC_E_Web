import { NavLink } from 'react-router-dom';
// Notice there is only ONE import line for lucide-react here now:
import { Home, CheckSquare, Activity, Settings, Bot } from 'lucide-react';

// Reusable Navigation Item Component
const NavItem = ({ to, icon }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex justify-center p-3 rounded-xl transition-all ${
        isActive ? 'text-white bg-white/10 shadow-inner' : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`
    }
  >
    {icon}
  </NavLink>
);

const Sidebar = () => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-24 bg-[#111111] flex-col items-center py-8 rounded-r-3xl my-4 shadow-xl z-20">
        <div className="text-white font-serif text-2xl font-bold mb-12">24.</div>
        <nav className="flex flex-col gap-8 w-full px-4 flex-grow">
          <NavItem to="/" icon={<Home size={24} />} />
          <NavItem to="/tasks" icon={<CheckSquare size={24} />} />
          <NavItem to="/activity" icon={<Activity size={24} />} />
          <NavItem to="/agent" icon={<Bot size={24} />} />
        </nav>
        <div className="w-full px-4">
          <NavItem to="/settings" icon={<Settings size={24} />} />
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#111111] flex justify-around items-center py-4 px-6 z-50 rounded-t-3xl shadow-2xl pb-safe">
        <NavItem to="/" icon={<Home size={24} />} />
        <NavItem to="/tasks" icon={<CheckSquare size={24} />} />
        <NavItem to="/activity" icon={<Activity size={24} />} />
        <NavItem to="/agent" icon={<Bot size={24} />} />
        <NavItem to="/settings" icon={<Settings size={24} />} />
      </nav>
    </>
  );
};

export default Sidebar;