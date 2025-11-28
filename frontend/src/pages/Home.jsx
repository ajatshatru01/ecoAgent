import Header from "../components/Header";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

function Home() {
  return (
    <>
      <Header />
      <main className="relative w-full min-h-screen text-white">
        <img
          fetchPriority="high"
          alt = "background image containing leaves"
          src="/images/background.webp"
          className="fixed inset-0 w-full h-full object-cover -z-20"
        ></img>
        <div className="fixed inset-0 bg-linear-to-br from-black/80 via-black/60 to-teal-900/40 -z-10"></div>

        <section className="relative flex flex-col items-center justify-center min-h-[90vh] text-center px-6 pt-24 md:pt-32">
          <div className="w-full max-w-5xl space-y-6 animate-fadeInUp">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Understand Your Emissions Intelligently.
              <br />
              <span className="text-[#FF9F3F]">
                Act Where Impact Matters Most.
              </span>
            </h1>

            <div className="max-w-2xl mx-auto">
              <p className="text-base sm:text-lg text-gray-300/90 leading-relaxed text-center">
                EcoAgent is an AI system that identifies, quantifies, and
                explains your organization's carbon emissions using adaptive
                data-driven logic.
              </p>
            </div>

            <Link to = "/info" className="inline-block mt-6 px-8 sm:px-10 py-4 text-lg sm:text-xl font-bold text-black bg-teal-400 rounded-full cursor-pointer shadow-[0_0_30px_rgba(45,212,191,0.4)] hover:shadow-[0_0_50px_rgba(45,212,191,0.7)] hover:bg-teal-300 hover:scale-110 active:scale-95 transition-all duration-300">
              Try Beta
            </Link>
          </div>
        </section>

        <section className="relative py-20 sm:py-24 px-6 bg-black/80 text-center backdrop-blur-md">
          <h1 className="text-3xl sm:text-4xl font-bold mb-12 sm:mb-14 animate-fadeIn">
            Why <span className="text-[#FFA500]">EcoAgent?</span>
          </h1>

          <div className="grid gap-8 sm:gap-10 md:grid-cols-2 max-w-5xl mx-auto text-left">
            <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-[#FFA500]/50 transition-all duration-300 hover:scale-[1.02]">
              <h2 className="text-xl sm:text-2xl mb-4 text-gray-300 font-semibold">
                Generic Carbon Tools
              </h2>
              <ul className="space-y-2 text-gray-400 text-sm sm:text-base">
                <li>❌ Use outdated emission factors</li>
                <li>❌ Ignore indirect (Scope 3) emissions</li>
                <li>❌ Treat every organization the same</li>
              </ul>
            </div>

            <div className="bg-[#FFA500]/10 rounded-2xl p-6 sm:p-8 border border-[#FFA500]/30 hover:border-[#FFA500]/70 transition-all duration-300 hover:scale-[1.02]">
              <h2 className="text-xl sm:text-2xl mb-4 text-[#FFA500] font-semibold">
                EcoAgent
              </h2>
              <ul className="space-y-2 text-gray-200 text-sm sm:text-base">
                <li>✅ Learns your operations & industry context</li>
                <li>✅ Covers full Scope 1, 2 & 3 emissions intelligently</li>
                <li>✅ Highlights root causes & confidence in data</li>
              </ul>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

export default Home;