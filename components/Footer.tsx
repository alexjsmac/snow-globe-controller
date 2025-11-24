import React from 'react';

export function Footer() {
  return (
    <footer className="bg-black border-t border-red-900/50 text-white mt-20 relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Author Section */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-mono mb-2 text-red-400 uppercase tracking-wider">
              [CREATOR]
            </h3>
            <p className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
              ALEX MACLEAN
            </p>
            <p className="text-gray-400 font-mono">
              &lt;<span className="text-cyan-400 font-bold">BLUHERON_INTERACTIVE</span>/&gt;
            </p>
          </div>

          {/* Contact and Social Links */}
          <div className="text-center md:text-right">
            <h3 className="text-sm font-mono mb-4 text-purple-400 uppercase tracking-wider">
              [CONNECT]
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-end">
              {/* Email Link */}
              <a
                href="mailto:alex@bluheroninteractive.com"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-black border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-950/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/30"
                aria-label="Email BluHeron Interactive"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span className="font-mono text-sm uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                  TRANSMIT::EMAIL
                </span>
              </a>

              {/* Instagram Link */}
              <a
                href="https://instagram.com/bluheroninteractive"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-black border border-purple-500/50 hover:border-purple-400 hover:bg-purple-950/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
                aria-label="Follow BluHeron Interactive on Instagram"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z" />
                </svg>
                <span className="font-mono text-sm uppercase tracking-wider group-hover:text-purple-400 transition-colors">
                  LINK::INSTAGRAM
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Decorative Divider */}
        <div className="mt-8 pt-8 border-t border-gray-900">
          <div className="text-center">
            <p className="text-gray-600 text-xs font-mono">
              &copy; {new Date().getFullYear()} | BLUHERON_INTERACTIVE | ALL_RIGHTS_RESERVED
            </p>
            <div className="mt-3 flex justify-center items-center gap-3">
              <div
                className="w-2 h-2 bg-cyan-500 animate-pulse"
                style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
              ></div>
              <p className="text-xs text-gray-700 font-mono uppercase tracking-wider">
                [THE_POLAR_VAULT::INTERFACE::ACTIVE]
              </p>
              <div
                className="w-2 h-2 bg-purple-500 animate-pulse"
                style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
