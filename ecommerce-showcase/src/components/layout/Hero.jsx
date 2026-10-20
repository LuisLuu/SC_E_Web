const Hero = () => {
  return (
    <div className="relative w-full h-[60vh] bg-[#e5e0d8]/30 flex items-center justify-center overflow-hidden rounded-2xl mb-16 mt-4">
      <div className="text-center z-10 px-4">
        <h1 className="text-5xl md:text-7xl font-serif font-bold text-primary mb-6 tracking-tight">
          Made for the daily ritual
        </h1>
        <p className="text-lg text-primary/70 mb-8 max-w-xl mx-auto">
          Thoughtful pieces for slow mornings, quiet moments, and intentional living.
        </p>
        <button className="bg-primary text-background px-8 py-3 rounded-full uppercase tracking-widest text-sm font-semibold hover:bg-primary/80 transition-all transform hover:-translate-y-0.5">
          Shop Collection
        </button>
      </div>
    </div>
  );
};

export default Hero;