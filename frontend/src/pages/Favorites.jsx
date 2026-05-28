import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Star, Trash2 } from "lucide-react";
import { AirlineBadge } from "../components/FlightCard.jsx";
import { deleteFavoriteItinerary, fetchFavoriteItineraries } from "../services/api.client.js";
import { usePlannerStore } from "../store/planner.store.js";

function formatShortDate(value) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function FavoriteRouteDetails({ favorite }) {
  const plan = favorite?.payload?.plan || null;
  const legs = plan?.followTeamRoute?.legs || [];
  if (!legs.length) {
    return <p className="text-sm font-medium text-slate-600">Este favorito no tiene ruta por tramos para mostrar.</p>;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">Ruta para seguir a tu seleccion</h2>
      <p className="mt-1 text-sm font-medium text-slate-600">
        Tramos calculados para llegar a todos los partidos con la opcion mas barata por tramo y fecha exacta.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {legs.map((leg, index) => (
          <article key={`${favorite.id}-${leg.fromCity}-${leg.toCity}-${index + 1}`} className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Tramo {index + 1}</p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {leg.fromCity} a {leg.toCity}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">Fecha exacta de salida: {leg.departureDate}</p>
            {leg.recommended ? (
              <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                <p>Precio: {leg.recommended.price} {leg.recommended.currency}</p>
                <p className="pt-1">
                  <AirlineBadge flight={leg.recommended} />
                </p>
                <p>Ruta vuelo: {leg.recommended.originIata} a {leg.recommended.destinationIata}</p>
                <p>Duracion: {leg.recommended.duration}</p>
                <p>
                  Escalas: {leg.recommended.stops}
                  {leg.recommended.stopoverAirports?.length
                    ? ` (${leg.recommended.stopoverAirports.join(", ")})`
                    : leg.recommended.stops === 0
                      ? " (vuelo directo)"
                      : ""}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold text-amber-700">
                {leg.searchError || "No se encontro vuelo automatico para este tramo."}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Favorites() {
  const navigate = useNavigate();
  const { authToken, setPlan, setProfile } = usePlannerStore();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingFavoriteId, setDeletingFavoriteId] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!authToken) return;
    let active = true;
    setLoading(true);
    setError("");
    fetchFavoriteItineraries(authToken)
      .then((response) => {
        if (!active) return;
        const items = response?.favorites || [];
        setFavorites(items);
        setSelectedId(items[0]?.id || "");
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || "No se pudieron cargar los favoritos.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authToken]);

  const selectedFavorite = useMemo(
    () => favorites.find((favorite) => favorite.id === selectedId) || favorites[0] || null,
    [favorites, selectedId]
  );

  if (!authToken) return <Navigate to="/" replace />;

  const openFavorite = (favorite) => {
    const payload = favorite?.payload || {};
    if (payload.profile) setProfile(payload.profile);
    if (payload.plan) {
      setPlan({
        ...payload.plan,
        favoriteMeta: {
          ...(payload.plan.favoriteMeta || {}),
          openedFromFavorite: true
        }
      });
    }
    navigate("/dashboard");
  };

  const onDeleteFavorite = async (favoriteId) => {
    if (!favoriteId || !authToken || deletingFavoriteId) return;
    setDeletingFavoriteId(favoriteId);
    setError("");
    try {
      await deleteFavoriteItinerary(favoriteId, authToken);
      setFavorites((prev) => {
        const next = prev.filter((favorite) => favorite.id !== favoriteId);
        if (!next.find((favorite) => favorite.id === selectedId)) {
          setSelectedId(next[0]?.id || "");
        }
        return next;
      });
    } catch (requestError) {
      setError(requestError.message || "No se pudo borrar el favorito.");
    } finally {
      setDeletingFavoriteId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star size={20} className="text-amber-500" />
            <h1 className="text-2xl font-black text-slate-950">Itinerarios favoritos</h1>
          </div>
          <Link to="/dashboard" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700">
            Volver
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Cargando favoritos...
          </div>
        )}

        {!loading && error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">{error}</p>}

        {!loading && !error && favorites.length === 0 && (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
            Aun no tienes itinerarios en favoritos.
          </p>
        )}

        {!loading && !error && favorites.length > 0 && (
          <>
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {favorites.map((favorite) => (
                <article
                  key={favorite.id}
                  className={`rounded-lg border p-3 shadow-sm ${
                    favorite.id === selectedFavorite?.id ? "border-cyan-300 bg-cyan-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-sm font-black text-slate-950">{favorite.title || "Itinerario"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {favorite.originCity || "Origen"} {"->"} {favorite.destinationCity || "Destino"} {"|"} {formatShortDate(favorite.departureDate)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(favorite.id)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-700"
                    >
                      Ver detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => openFavorite(favorite)}
                      className="rounded-md bg-cyan-200 px-3 py-1.5 text-xs font-black text-slate-950"
                    >
                      Abrir en dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFavorite(favorite.id)}
                      disabled={deletingFavoriteId === favorite.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-60"
                    >
                      <Trash2 size={12} />
                      {deletingFavoriteId === favorite.id ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {selectedFavorite && <FavoriteRouteDetails favorite={selectedFavorite} />}
          </>
        )}
      </div>
    </main>
  );
}
