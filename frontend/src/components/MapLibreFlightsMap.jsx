import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import { cityCoordinates } from "../data/cityCoordinates.js";
import { hostVenues } from "../data/hostVenues.js";

function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCoordinates(city) {
  return cityCoordinates[normalizeText(city)] || null;
}

const hostCountryByCity = hostVenues.reduce((lookup, venue) => {
  lookup[normalizeText(venue.city)] = venue.countryCode;
  return lookup;
}, {});

const cityCountryAliases = {
  "new york": "us",
  "new jersey": "us",
  "san francisco": "us",
  "san francisco bay area": "us",
  "los angeles": "us",
  washington: "us",
  chicago: "us",
  cancun: "mx",
  "mexico city": "mx",
  toronto: "ca",
  vancouver: "ca",
  montreal: "ca"
};

const legalNoticeByCountry = {
  us: {
    emoji: "🛂",
    title: "Aviso USA",
    text:
      "Revisa antes de volar si necesitas ESTA o visado B; lleva pasaporte valido y recuerda que la autorizacion no garantiza entrada.",
    sourceLabel: "ESTA oficial",
    sourceUrl: "https://esta.cbp.dhs.gov/",
    className: "border-amber-300 bg-amber-50 text-amber-950"
  },
  mx: {
    emoji: "🌮",
    title: "Aviso Mexico",
    text:
      "Comprueba si tu nacionalidad exige visa; al entrar pueden registrar tu estancia con FMM/FMMD y debes conservar el documento hasta salir.",
    sourceLabel: "Gobierno MX",
    sourceUrl: "https://portales.sre.gob.mx/6aec/images/documentos/fr/info-visas-ing.pdf",
    className: "border-emerald-300 bg-emerald-50 text-emerald-950"
  },
  ca: {
    emoji: "🍁",
    title: "Aviso Canada",
    text:
      "Segun tu pasaporte y medio de entrada puedes necesitar eTA o visa de visitante; confirma requisitos oficiales antes de reservar.",
    sourceLabel: "Canada.ca",
    sourceUrl: "https://www.canada.ca/eTA",
    className: "border-sky-300 bg-sky-50 text-sky-950"
  }
};

function getCountryCode(city) {
  const normalized = normalizeText(city);
  return hostCountryByCity[normalized] || cityCountryAliases[normalized] || null;
}

function getLegalNotices(destinationCity, segments) {
  const destinationCities = (segments || [])
    .map((segment) => segment.toCity)
    .filter(Boolean);
  if (destinationCity) destinationCities.push(destinationCity);

  const countryCodes = Array.from(
    new Set(destinationCities.map((city) => getCountryCode(city)).filter((countryCode) => legalNoticeByCountry[countryCode]))
  );

  return countryCodes.map((countryCode) => legalNoticeByCountry[countryCode]);
}

function segmentsToFeatures(originCity, destinationCity, segments) {
  const normalized = (segments || [])
    .map((segment) => {
      const from = segment.fromCoordinates || getCoordinates(segment.fromCity);
      const to = segment.toCoordinates || getCoordinates(segment.toCity);
      if (!from || !to) return null;
      return {
        type: "Feature",
        properties: {
          fromCity: segment.fromCity,
          toCity: segment.toCity
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [from.lon, from.lat],
            [to.lon, to.lat]
          ]
        }
      };
    })
    .filter(Boolean);

  if (normalized.length) return normalized;

  const from = getCoordinates(originCity);
  const to = getCoordinates(destinationCity);
  if (!from || !to) return [];
  return [
    {
      type: "Feature",
      properties: { fromCity: originCity, toCity: destinationCity },
      geometry: { type: "LineString", coordinates: [[from.lon, from.lat], [to.lon, to.lat]] }
    }
  ];
}

export default function MapLibreFlightsMap({ originCity, destinationCity, segments = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const lineFeatures = useMemo(
    () => segmentsToFeatures(originCity, destinationCity, segments),
    [originCity, destinationCity, segments]
  );
  const legalNotices = useMemo(() => getLegalNotices(destinationCity, segments), [destinationCity, segments]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [-30, 30],
      zoom: 1.3,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("flight-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: lineFeatures
        }
      });

      map.addLayer({
        id: "flight-route-line",
        type: "line",
        source: "flight-routes",
        paint: {
          "line-color": "#facc15",
          "line-width": 3,
          "line-opacity": 0.95
        }
      });

      const points = [];
      lineFeatures.forEach((feature) => {
        const [from, to] = feature.geometry.coordinates;
        points.push({
          type: "Feature",
          properties: { label: feature.properties.fromCity },
          geometry: { type: "Point", coordinates: from }
        });
        points.push({
          type: "Feature",
          properties: { label: feature.properties.toCity },
          geometry: { type: "Point", coordinates: to }
        });
      });

      map.addSource("route-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: points }
      });
      map.addLayer({
        id: "route-points-dot",
        type: "circle",
        source: "route-points",
        paint: {
          "circle-radius": 5,
          "circle-color": "#22c55e",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1
        }
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lineFeatures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("flight-routes")) return;
    map.getSource("flight-routes").setData({
      type: "FeatureCollection",
      features: lineFeatures
    });
    if (map.getSource("route-points")) {
      const points = [];
      lineFeatures.forEach((feature) => {
        const [from, to] = feature.geometry.coordinates;
        points.push({
          type: "Feature",
          properties: { label: feature.properties.fromCity },
          geometry: { type: "Point", coordinates: from }
        });
        points.push({
          type: "Feature",
          properties: { label: feature.properties.toCity },
          geometry: { type: "Point", coordinates: to }
        });
      });
      map.getSource("route-points").setData({
        type: "FeatureCollection",
        features: points
      });
    }

    const bounds = new maplibregl.LngLatBounds();
    lineFeatures.forEach((feature) => {
      feature.geometry.coordinates.forEach((point) => bounds.extend(point));
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 4, duration: 600 });
    }
  }, [lineFeatures]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-base font-semibold">Mapa de Trayectos (MapLibre)</h3>
      <div ref={containerRef} className="h-[360px] w-full overflow-hidden rounded-md" />
      {legalNotices.length > 0 && (
        <div className="mt-4 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-slate-950">⚖️ Avisos legales de viaje</h4>
            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500 ring-1 ring-slate-200">
              Oficial
            </span>
          </div>
          <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
            {legalNotices.map((notice) => (
              <article key={notice.title} className={`rounded-md border px-3 py-2 ${notice.className}`}>
                <p className="text-sm font-black">
                  <span aria-hidden="true">{notice.emoji}</span> {notice.title}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5">
                  {notice.text}{" "}
                  <a
                    href={notice.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex font-black underline decoration-2 underline-offset-2"
                  >
                    {notice.sourceLabel}
                  </a>
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
