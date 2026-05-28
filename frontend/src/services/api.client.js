const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function findCheapestLegFlight({
  fromCity,
  toCity,
  departureDate,
  adults,
  cabinClass,
  maxStops,
  originAirport,
  destinationAirport
}) {
  const response = await request("/flights/search", {
    method: "POST",
    body: JSON.stringify({
      originCity: fromCity,
      destinationCity: toCity,
      departureDate,
      adults,
      cabinClass,
      maxStops,
      originAirport,
      destinationAirport,
      preferences: ["barato"]
    })
  });

  const allOffers = response?.offers || [];
  const exactDateOffers = allOffers.filter((offer) => offer.departureDate === departureDate);
  const offers = (exactDateOffers.length ? exactDateOffers : allOffers).sort((a, b) => a.price - b.price);
  const cheapest = offers[0] || null;
  const fastest = offers.length
    ? [...offers].sort((a, b) => (a.durationMinutes || Number.MAX_SAFE_INTEGER) - (b.durationMinutes || Number.MAX_SAFE_INTEGER))[0] || null
    : null;
  const originCandidates = response?.originAirports?.map((airport) => airport.iata) || [];
  const destinationCandidates = response?.destinationAirports?.map((airport) => airport.iata) || [];

  return {
    recommended: cheapest,
    cheapest,
    fastest,
    alternatives: offers.slice(0, 5),
    originCandidates,
    destinationCandidates,
    searchError: cheapest ? null : "No se encontraron vuelos para este tramo en Ignav."
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

export function buildPlan(body) {
  return request("/itinerary/plan", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function registerUser(body) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function loginUser(body) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function fetchAirports(city) {
  return request(`/flights/airports?city=${encodeURIComponent(city)}`);
}

export function fetchMatches() {
  return request("/matches");
}

export function fetchCurrentTime(timezone = "Europe/Madrid") {
  return request(`/time?timezone=${encodeURIComponent(timezone)}`);
}

export function fetchDestinationGuide(city, originCity = "") {
  const params = new URLSearchParams({ city });
  if (originCity) params.set("originCity", originCity);
  return request(`/places/destination?${params.toString()}`);
}

export async function enrichFollowTeamPlanWithIgnav(plan, profile) {
  const legs = plan?.followTeamRoute?.legs || [];
  if (!legs.length) return plan;

  const cabinClass = profile?.cabinClass || "economy";
  const maxStops = Number(profile?.maxStops ?? 1);
  const adults = Number(profile?.adults ?? 1);
  const updatedLegs = [];

  for (const leg of legs) {
    const ranked = await findCheapestLegFlight({
      fromCity: leg.fromCity,
      toCity: leg.toCity,
      departureDate: leg.departureDate,
      adults,
      cabinClass,
      maxStops,
      originAirport: leg.originAirport || null,
      destinationAirport: leg.destinationAirport || null
    });

    updatedLegs.push({
      ...leg,
      recommended: ranked.recommended,
      cheapest: ranked.cheapest,
      fastest: ranked.fastest,
      alternatives: ranked.alternatives,
      originCandidates: ranked.originCandidates,
      destinationCandidates: ranked.destinationCandidates,
      searchError: ranked.searchError
    });
  }

  const baseSegments = plan?.followTeamRoute?.segments || plan?.routeSegments || [];
  const updatedSegments = updatedLegs.map((leg, index) => ({
    ...(baseSegments[index] || {}),
    id: baseSegments[index]?.id || `${index + 1}-${leg.fromCity}-${leg.toCity}`,
    fromCity: leg.fromCity,
    toCity: leg.toCity,
    departureDate: leg.departureDate,
    flight: leg.recommended
  }));

  const totalPrice = updatedLegs.reduce((sum, leg) => sum + Number(leg?.recommended?.price || 0), 0);
  const currency = updatedLegs.find((leg) => leg?.recommended?.currency)?.recommended?.currency || "USD";
  const budget = plan?.profile?.budget ?? profile?.budget ?? null;
  const budgetStatus =
    budget == null ? "no_budget_provided" : totalPrice <= Number(budget) ? "within_budget" : "over_budget";

  return {
    ...plan,
    followTeamRoute: {
      ...(plan.followTeamRoute || {}),
      legs: updatedLegs,
      segments: updatedSegments
    },
    routeSegments: updatedSegments,
    costs: {
      ...(plan.costs || {}),
      estimatedTotalCost: totalPrice,
      currency,
      budgetStatus
    },
    recommendationText:
      totalPrice > 0
        ? "Ruta de vuelos calculada con Ignav via backend, seleccionando la opcion mas barata por cada tramo y fecha exacta."
        : plan.recommendationText,
    dataSources: {
      ...(plan.dataSources || {}),
      flights: "Ignav API (backend proxy)"
    }
  };
}

export async function enrichTravelCityPlanWithIgnav(plan, profile) {
  const originCity = profile?.originCity || plan?.profile?.originCity;
  const destinationCity = plan?.profile?.destinationCity || profile?.destinationCity;
  const departureDate = profile?.departureDate || plan?.profile?.departureDate;
  if (!originCity || !destinationCity || !departureDate) return plan;
  if (normalizeText(originCity) === normalizeText(destinationCity)) return plan;

  const ranked = await findCheapestLegFlight({
    fromCity: originCity,
    toCity: destinationCity,
    departureDate,
    adults: Number(profile?.adults ?? plan?.profile?.adults ?? 1),
    cabinClass: profile?.cabinClass || plan?.profile?.cabinClass || "economy",
    maxStops: Number(profile?.maxStops ?? plan?.profile?.maxStops ?? 1),
    originAirport: profile?.originAirport || plan?.profile?.originAirport || null,
    destinationAirport: profile?.destinationAirport || plan?.profile?.destinationAirport || null
  });

  const selected = ranked.recommended;
  const updatedRouteSegments = (plan?.routeSegments || []).map((segment, index) =>
    index === 0 ? { ...segment, flight: selected || null } : segment
  );
  const estimatedTotalCost = Number(selected?.price || 0);
  const currency = selected?.currency || plan?.costs?.currency || "USD";
  const budget = plan?.profile?.budget ?? profile?.budget ?? null;
  const budgetStatus =
    budget == null
      ? "no_budget_provided"
      : estimatedTotalCost <= Number(budget)
        ? "within_budget"
        : "over_budget";

  return {
    ...plan,
    flights: {
      cheapest: ranked.cheapest,
      fastest: ranked.fastest,
      recommended: selected,
      alternatives: ranked.alternatives || []
    },
    flightError: selected ? null : ranked.searchError,
    routeSegments: updatedRouteSegments,
    costs: {
      ...(plan.costs || {}),
      estimatedTotalCost,
      currency,
      budgetStatus
    },
    recommendationText: selected
      ? "Vuelo calculado con Ignav via backend para la ciudad elegida, usando la opcion mas barata en la fecha exacta."
      : plan.recommendationText,
    dataSources: {
      ...(plan.dataSources || {}),
      flights: "Ignav API (backend proxy)"
    }
  };
}

export function apiAssetUrl(url) {
  if (!url || !url.startsWith("/api/")) return url;
  return `${API_URL.replace(/\/api$/, "")}${url}`;
}
