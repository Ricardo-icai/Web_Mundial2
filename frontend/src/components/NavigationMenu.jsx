import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Landmark, Menu, Star, Trophy, X } from "lucide-react";

const menuItems = [
  { to: "/dashboard", label: "Dashboard general", icon: LayoutDashboard },
  { to: "/itinerary", label: "Itinerario completo", icon: CalendarDays },
  { to: "/attractions", label: "Planes y zonas", icon: Landmark },
  { to: "/tournament", label: "Torneo", icon: Trophy },
  { to: "/favorites", label: "Favoritos", icon: Star }
];

export default function NavigationMenu({ variant = "glass" }) {
  const [open, setOpen] = useState(false);
  const buttonClass =
    variant === "light"
      ? "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
      : "inline-flex items-center gap-2 rounded-md border border-white/50 bg-white/10 px-3 py-2 text-sm font-black text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg";

  const menuPanel = open
    ? createPortal(
        <div className="fixed inset-0 z-[200] bg-slate-950/60 navigation-menu-backdrop">
          <button type="button" className="absolute inset-0 h-full w-full" aria-label="Cerrar menu" onClick={() => setOpen(false)} />
          <aside className="navigation-menu-panel absolute left-0 top-0 h-full w-full max-w-sm border-r border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Menu de acciones</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition-all duration-200 hover:bg-slate-100 hover:shadow-sm"
              >
                <X size={17} />
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {menuItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-black text-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm"
                  to={to}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </div>
          </aside>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        <Menu size={18} />
        Menu
      </button>
      {menuPanel}
    </>
  );
}
