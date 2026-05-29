import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { CalendarDays, Loader2, Star } from "lucide-react";
import PageHero from "../components/PageHero.jsx";
import { saveFavoriteItinerary } from "../services/api.client.js";
import FlightCard, { AirlineBadge } from "../components/FlightCard.jsx";
import Timeline from "../components/Timeline.jsx";
import { usePlannerStore } from "../store/planner.store.js";
import { itineraryHeroImage } from "../data/worldCupVisuals.js";

export default function Itinerary() {
  const { plan, profile, authToken } = usePlannerStore();
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const [savingFlightFavoriteKey, setSavingFlightFavoriteKey] = useState("");
  const followTeamLegs = plan?.followTeamRoute?.legs || [];
  const isFollowTeamPlan = profile?.mode === "follow_team";
  const isTravelCityPlan = profile?.mode === "travel_city";
  const isOpenedFromFavorite = Boolean(plan?.favoriteMeta?.openedFromFavorite);
  const adultsCount = Number(plan?.profile?.adults ?? profile?.adults ?? 1);
  const selectedTravelFavoriteFlight = plan?.favoriteSelection?.flight || plan?.flights?.recommended || null;
  const selectedTravelFavoriteLabel = plan?.favoriteSelection?.flightLabel || "Recomendado";

  if (!plan) return <Navigate to="/" replace />;

  const favoriteTitle = useMemo(() => {
    const modeLabel =
      profile?.mode === "follow_team"
        ? `Seguir ${profile?.favoriteTeam || "seleccion"}`
        : profile?.mode === "stay_origin"
          ? `Ver Mundial en ${profile?.originCity || "ciudad"}`
          : "Viaje Mundial";
    const origin = profile?.originCity || plan?.profile?.originCity || "Origen";
    const destination = profile?.destinationCity || plan?.profile?.destinationCity || "Destino";
    return `${modeLabel}: ${origin} -> ${destination}`;
  }, [plan, profile]);

  const onSaveFavorite = async () => {
    if (!authToken || !profile || !plan || savingFavorite) return;
    setSavingFavorite(true);
    setFavoriteError("");
    try {
      await saveFavoriteItinerary(
        {
          title: favoriteTitle,
          profile,
          plan
        },
        authToken
      );
      setFavoriteSaved(true);
    } catch (error) {
      setFavoriteError(error.message || "No se pudo guardar en favoritos.");
    } finally {
      setSavingFavorite(false);
    }
  };

  const flightLabelByKey = {
    cheapest: "Mas barato",
    fastest: "Mas rapido",
    recommended: "Recomendado"
  };

  const onSaveTravelFlightFavorite = async (flightKey) => {
    if (!authToken || !profile || !plan || savingFlightFavoriteKey) return;
    const selectedFlight = plan?.flights?.[flightKey];
    if (!selectedFlight) return;

    setSavingFlightFavoriteKey(flightKey);
    setFavoriteError("");
    try {
      const planSnapshot = {
        ...plan,
        favoriteSelection: {
          type: "travel_city_flight",
          flightKey,
          flightLabel: flightLabelByKey[flightKey] || "Vuelo",
          flight: selectedFlight
        },
        routeSegments: (plan?.routeSegments || []).map((segment, index) =>
          index === 0 ? { ...segment, flight: selectedFlight } : segment
        )
      };

      await saveFavoriteItinerary(
        {
          title: `${favoriteTitle} - ${flightLabelByKey[flightKey] || "Vuelo"}`,
          profile,
          plan: planSnapshot
        },
        authToken
      );
      setFavoriteSaved(true);
    } catch (error) {
      setFavoriteError(error.message || "No se pudo guardar en favoritos.");
    } finally {
      setSavingFlightFavoriteKey("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-6">
      <PageHero
        image={itineraryHeroImage}
        imageAlt="Avion en pista antes del viaje"
        eyebrowIcon={<CalendarDays size={15} />}
        eyebrow="Itinerario"
        title="Itinerario completo"
        description={
          isFollowTeamPlan
            ? `Ruta para seguir a ${profile?.favoriteTeam || "tu seleccion"} desde ${profile?.originCity || "origen"}.`
            : isTravelCityPlan
              ? `Opciones de vuelo y agenda para viajar a ${profile?.destinationCity || plan?.profile?.destinationCity || "la sede"}.`
              : `Agenda para vivir el Mundial desde ${profile?.originCity || "tu ciudad"}.`
        }
        actions={
          authToken && !isOpenedFromFavorite ? (
            <button
              type="button"
              onClick={onSaveFavorite}
              disabled={savingFavorite}
              className={`group inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-black transition-all duration-200 ${
                favoriteSaved
                  ? "bg-amber-50 text-amber-700"
                  : "bg-white text-slate-950 hover:-translate-y-0.5 hover:bg-amber-50 hover:text-amber-800 hover:shadow-lg"
              }`}
            >
              {savingFavorite ? <Loader2 className="animate-spin" size={18} /> : <Star size={18} className={favoriteSaved ? "fill-amber-400 text-amber-500" : ""} />}
              {favoriteSaved ? "Guardado" : "Guardar itinerario"}
            </button>
          ) : null
        }
      />
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {favoriteError && <p className="text-sm font-semibold text-amber-700">{favoriteError}</p>}
        {favoriteSaved && <p className="text-sm font-semibold text-emerald-700">Itinerario guardado en favoritos.</p>}
        {!authToken && <p className="text-xs font-semibold text-slate-500">Inicia sesion para guardar favoritos.</p>}
        {isFollowTeamPlan && followTeamLegs.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Ruta para seguir a tu seleccion</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Tramos calculados para llegar a todos los partidos con la opcion mas barata por tramo y fecha exacta.
            </p>
            {plan.flightError && <p className="mt-2 text-sm font-semibold text-amber-700">{plan.flightError}</p>}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {followTeamLegs.map((leg, index) => (
                <article key={`${leg.fromCity}-${leg.toCity}-${index + 1}`} className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-bold uppercase text-slate-500">Tramo {index + 1}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {leg.fromCity} a {leg.toCity}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Fecha exacta de salida: {leg.departureDate}</p>
                  {leg.recommended ? (
                    <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
                      <p>Precio: {leg.recommended.price} {leg.recommended.currency}</p>
                      {adultsCount > 1 && (
                        <p>Total tramo {adultsCount} viajeros: {Number(leg.recommended.price || 0) * adultsCount} {leg.recommended.currency}</p>
                      )}
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
        )}
        {isTravelCityPlan && !isOpenedFromFavorite && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Opciones de vuelo para este itinerario</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Puedes guardar en favoritos una opcion concreta junto con este itinerario.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {["cheapest", "fastest", "recommended"].map((flightKey) => (
                <div key={flightKey} className="space-y-2">
                  <FlightCard
                    label={flightLabelByKey[flightKey]}
                    flight={plan?.flights?.[flightKey]}
                    adults={adultsCount}
                  />
                  {authToken && (
                    <button
                      type="button"
                      disabled={!plan?.flights?.[flightKey] || Boolean(savingFlightFavoriteKey)}
                      onClick={() => onSaveTravelFlightFavorite(flightKey)}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 hover:shadow-[0_8px_20px_rgba(245,158,11,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingFlightFavoriteKey === flightKey ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Star size={13} className="text-slate-600 transition-all duration-200 group-hover:scale-110 group-hover:text-amber-500" />
                          Guardar este vuelo + itinerario
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {!isFollowTeamPlan && selectedTravelFavoriteFlight && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">Vuelo mostrado con este itinerario: {selectedTravelFavoriteLabel}</h2>
            <div className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
              <p>Precio: {selectedTravelFavoriteFlight.price} {selectedTravelFavoriteFlight.currency}</p>
              <p className="pt-1">
                <AirlineBadge flight={selectedTravelFavoriteFlight} />
              </p>
              <p>Ruta vuelo: {selectedTravelFavoriteFlight.originIata} a {selectedTravelFavoriteFlight.destinationIata}</p>
              <p>Duracion: {selectedTravelFavoriteFlight.duration}</p>
              <p>Escalas: {selectedTravelFavoriteFlight.stops}</p>
            </div>
          </section>
        )}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black">Itinerario</h2>
          <div className="mt-3">
            <Timeline items={plan.itinerary} />
          </div>
        </section>
      </div>
    </main>
  );
}
