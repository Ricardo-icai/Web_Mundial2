import { Trophy } from "lucide-react";
import { fifa26Logo } from "../data/worldCupVisuals.js";

export default function LoadingOverlay({ message = "Cargando" }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#4f82c4] px-6 text-white">
      <div className="absolute inset-0 loading-field-pattern opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#5f9ce0]/85 via-[#3d74b8]/90 to-[#11345f]/95" />
      <div className="pointer-events-none absolute inset-0 loading-black-linework" />
      <div className="relative flex min-h-[420px] w-full max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-black uppercase tracking-[0.22em] shadow-lg shadow-slate-950/20 backdrop-blur">
          <Trophy size={17} />
          Mundial 2026
        </div>
        <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-full border border-white/35 loading-logo-orbit" />
          <div className="absolute inset-8 rounded-full border border-cyan-100/30 loading-logo-orbit-reverse" />
          <div className="loading-plane-orbit absolute -inset-14 rounded-full sm:-inset-16" aria-hidden="true">
            <div className="loading-plane-wrap">
              <span className="loading-plane-trail" />
              <svg className="loading-plane-illustration" viewBox="0 -14 116 138">
                <path
                  className="loading-plane-doodle-shadow"
                  d="M10 40c-3.2.1-5.8 2.7-6.1 5.9-.2 3 1.8 5.7 4.7 6.4l34 8.5c3 .8 4.7 3.9 3.6 6.8l-7.9 21c-.7 1.9-2.3 3.3-4.4 3.6l-17.3 2.4c-3 .4-5.2 3.1-5 6.1.2 3.2 2.9 5.6 6 5.6h10.7c1.2 0 2.4.3 3.4 1l23.6 13.7c2.8 1.6 6.4.8 8.2-1.9 1.5-2.3 1.4-5.4-.4-7.6l-7.4-9.5c-1.3-1.7-1.6-3.9-.8-5.9l10.4-25.9c1.4-3.5 5.9-4.5 8.6-1.9l25.6 24.5c2.4 2.3 6.2 2.4 8.6.1 2.2-2 2.6-5.4.9-7.9L75.1 38.8c-1.1-1.5-1.4-3.5-.7-5.3l14-31c1.4-3.1-.2-6.8-3.4-7.9-2.9-1-6.1.4-7.3 3.2L61.2 35.1c-.9 2.1-3 3.5-5.3 3.5L10 40Z"
                />
                <path
                  className="loading-plane-doodle"
                  d="M10 36c-3.2.1-5.8 2.7-6.1 5.9-.2 3 1.8 5.7 4.7 6.4l34 8.5c3 .8 4.7 3.9 3.6 6.8l-7.9 21c-.7 1.9-2.3 3.3-4.4 3.6l-17.3 2.4c-3 .4-5.2 3.1-5 6.1.2 3.2 2.9 5.6 6 5.6h10.7c1.2 0 2.4.3 3.4 1l23.6 13.7c2.8 1.6 6.4.8 8.2-1.9 1.5-2.3 1.4-5.4-.4-7.6l-7.4-9.5c-1.3-1.7-1.6-3.9-.8-5.9l10.4-25.9c1.4-3.5 5.9-4.5 8.6-1.9l25.6 24.5c2.4 2.3 6.2 2.4 8.6.1 2.2-2 2.6-5.4.9-7.9L75.1 34.8c-1.1-1.5-1.4-3.5-.7-5.3l14-31c1.4-3.1-.2-6.8-3.4-7.9-2.9-1-6.1.4-7.3 3.2L61.2 31.1c-.9 2.1-3 3.5-5.3 3.5L10 36Z"
                />
              </svg>
            </div>
          </div>
          <div className="loading-logo-card flex h-44 w-36 items-center justify-center rounded-2xl bg-black p-4 shadow-2xl shadow-slate-950/35 ring-1 ring-white/20 sm:h-56 sm:w-44">
            <img src={fifa26Logo} alt="FIFA World Cup 26" className="h-full w-full object-contain" />
          </div>
        </div>
        <p className="display-heading-small mt-8 text-4xl uppercase sm:text-5xl">{message}</p>
        <div className="mt-5 flex items-center gap-2" aria-hidden="true">
          <span className="loading-dot" />
          <span className="loading-dot loading-dot-delay-1" />
          <span className="loading-dot loading-dot-delay-2" />
        </div>
      </div>
    </div>
  );
}
