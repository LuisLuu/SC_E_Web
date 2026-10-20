import { ShoppingCart, Search, User } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-background border-b border-accent px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo Area */}
        <div className="text-2xl font-serif font-bold tracking-tight text-primary cursor-pointer">
          24.
        </div>

        {/* Center Navigation Links (Hidden on mobile for now) */}
        <div className="hidden md:flex space-x-8 text-xs uppercase tracking-widest text-primary/80 font-semibold">
          <a href="#" className="hover:text-primary transition-colors">Shop</a>
          <a href="#" className="hover:text-primary transition-colors">Collections</a>
          <a href="#" className="hover:text-primary transition-colors">About</a>
        </div>

        {/* Action Icons */}
        <div className="flex items-center space-x-6 text-primary">
        <button className="hover:opacity-70 transition-opacity"><Search size={20} /></button>
        <button className="hover:opacity-70 transition-opacity"><User size={20} /></button>
        
        {/* Cart Icon with Notification Badge */}
        <button className="relative hover:opacity-70 transition-opacity">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
            0
            </span>
        </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;