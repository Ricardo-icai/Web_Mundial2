import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cityOptions } from "../data/cityOptions.js";

const normalizeText = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function CityAutocomplete({ label, name, value, onChange, required = false }) {
  const [open, setOpen] = useState(false);
  const normalizedValue = normalizeText(value);

  const filteredCities = useMemo(() => {
    if (!normalizedValue) return cityOptions.slice(0, 10);

    const startsWithMatches = cityOptions.filter((city) => normalizeText(city).startsWith(normalizedValue));
    const containsMatches = cityOptions.filter((city) => {
      const normalizedCity = normalizeText(city);
      return !normalizedCity.startsWith(normalizedValue) && normalizedCity.includes(normalizedValue);
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 10);
  }, [normalizedValue]);

  const chooseCity = (city) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <div
      className="relative text-sm font-bold"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <label htmlFor={name}>{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-white/20 bg-white/85 px-3 py-2 text-slate-950 transition focus-within:border-cyan-200 focus-within:ring-2 focus-within:ring-cyan-200/30">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          id={name}
          name={name}
          className="w-full bg-transparent font-medium outline-none placeholder:text-slate-400"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          required={required}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950 shadow-2xl">
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredCities.map((city) => (
              <button
                key={city}
                type="button"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-black transition ${
                  normalizeText(city) === normalizedValue
                    ? "bg-cyan-50 text-brandBlue"
                    : "text-slate-800 hover:bg-slate-100"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCity(city)}
              >
                <MapPin size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{city}</span>
              </button>
            ))}
            {!filteredCities.length && (
              <p className="px-3 py-5 text-center text-sm font-semibold text-slate-500">Sin resultados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
