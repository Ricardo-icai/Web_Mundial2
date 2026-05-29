import AuthPanel from "./AuthPanel.jsx";
import NavigationMenu from "./NavigationMenu.jsx";
import { fifa26Logo } from "../data/worldCupVisuals.js";

export default function PageHero({ image, imageAlt, eyebrowIcon, eyebrow, title, description, actions = null }) {
  return (
    <section className="relative overflow-hidden px-4 py-6 text-white">
      <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-slate-950/58" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/72 to-slate-950/18" />
      <div className="relative mx-auto flex min-h-[360px] max-w-7xl flex-col gap-10 sm:min-h-[420px] sm:gap-14">
        <header className="relative z-20 flex items-center justify-between gap-3 rounded-lg border border-cyan-100/20 bg-gradient-to-r from-[#06111f]/92 via-[#08304b]/88 to-[#0f3d2e]/88 p-3 shadow-[0_18px_45px_rgba(2,6,23,0.38)] backdrop-blur-2xl">
          <NavigationMenu />
          <div className="flex shrink-0 items-center gap-3">
            <AuthPanel />
            <a
              href="https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026"
              target="_blank"
              rel="noreferrer"
              className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black shadow-xl shadow-black/35 ring-1 ring-cyan-100/25 sm:h-20 sm:w-16"
              title="FIFA World Cup 26"
            >
              <img src={fifa26Logo} alt="FIFA World Cup 26" className="h-full w-full object-contain p-1" />
            </a>
          </div>
        </header>
        <div className="max-w-3xl pb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] backdrop-blur">
            {eyebrowIcon}
            {eyebrow}
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-base font-medium text-white/85 sm:text-lg">{description}</p>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
