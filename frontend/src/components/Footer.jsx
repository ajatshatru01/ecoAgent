function Footer() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  return (
    <footer className="flex flex-col md:flex-row items-center justify-between w-full py-8 px-6 sm:px-10 bg-black/80 text-gray-400 border-t border-white/10 backdrop-blur-md animate-fadeIn">
      <p className="text-sm text-center md:text-left mb-4 md:mb-0">
        © {currentYear} <span className="text-[#FFA500] font-semibold">EcoAgent</span>.
        All rights reserved.
      </p>

      <a
        href="https://devfolio.co/projects/ecoagent-854d"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 hover:text-[#FFA500] transition text-sm"
      >
        <img src="/images/devfolio.webp" alt="Devfolio" className="w-6 h-6" />
        <span>View on Devfolio</span>
      </a>
    </footer>
  );
}

export default Footer;