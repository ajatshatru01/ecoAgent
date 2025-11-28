import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center justify-between w-[80%] max-w-6xl px-8 py-4 rounded-full backdrop-blur-xl bg-black/30 border border-white/10 shadow-lg z-50 animate-fadeIn">
      <Link to="/" className="cursor-pointer w-14 h-auto shrink-0">
        <img src="/images/logo.webp" alt="Logo" className="w-full h-auto" />
      </Link>

      <Link to="/info" className="px-6 py-2.5 rounded-full border border-teal-200 bg-transparent text-white font-semibold transition-all duration-400 ease-in-out hover:bg-teal-400 hover:text-black hover:shadow-md cursor-pointer">
        Try Beta
      </Link>
    </header>
  );
}

export default Header;