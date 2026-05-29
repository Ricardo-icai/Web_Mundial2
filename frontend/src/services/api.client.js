const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateMinusDays(isoDate, days) {
  return addDays(isoDate, -Math.abs(days));
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

function totalFlightCost(flights = [], adults = 1) {
  return flights.reduce((sum, flight) => sum + Number(flight?.price || 0), 0) * adults;
}

function buildFollowTeamStops(matches = [], originCity) {
  const sortedMatches = [...matches].sort((a, b) =>
    `${a.date}T${a.timeUtc || "00:00:00"}`.localeCompare(`${b.date}T${b.timeUtc || "00:00:00"}`)
  );
  if (!sortedMatches.length) return [];

  const stops = [];
  const first = sortedMatches[0];
  stops.push({
    fromCity: originCity,
    toCity: first.city,
    departureDate: dateMinusDays(first.date, 1)
  });

  for (let index = 1; index < sortedMatches.length; index += 1) {
    const previous = sortedMatches[index - 1];
    const current = sortedMatches[index];
    if (normalizeText(previous.city) === normalizeText(current.city)) continue;
    stops.push({
      fromCity: previous.city,
      toCity: current.city,
      departureDate: dateMinusDays(current.date, 1)
    });
  }

  const last = sortedMatches[sortedMatches.length - 1];
  if (normalizeText(last.city) !== normalizeText(originCity)) {
    stops.push({
      fromCity: last.city,
      toCity: originCity,
      departureDate: addDays(last.date, 1)
    });
  }
  return stops;
}

function computeCityFlightCosts(legs = [], originCity) {
  const origin = normalizeText(originCity);
  const cityCosts = new Map();
  for (const leg of legs) {
    const price = Number(leg?.recommended?.price || 0);
    if (!price) continue;
    const from = normalizeText(leg.fromCity);
    const to = normalizeText(leg.toCity);
    if (from !== origin) {
      cityCosts.set(leg.fromCity, (cityCosts.get(leg.fromCity) || 0) + price);
    }
    if (to !== origin) {
      cityCosts.set(leg.toCity, (cityCosts.get(leg.toCity) || 0) + price);
    }
  }
  return cityCosts;
}

async function buildLegsForStops({
  stops,
  adults,
  cabinClass,
  maxStops
}) {
  const legs = [];
  for (const stop of stops) {
    const ranked = await findCheapestLegFlight({
      fromCity: stop.fromCity,
      toCity: stop.toCity,
      departureDate: stop.departureDate,
      adults,
      cabinClass,
      maxStops,
      originAirport: stop.originAirport || null,
      destinationAirport: stop.destinationAirport || null
    });
    legs.push({
      ...stop,
      recommended: ranked.recommended,
      cheapest: ranked.cheapest,
      fastest: ranked.fastest,
      alternatives: ranked.alternatives,
      searchError: ranked.searchError
    });
  }
  return legs;
}

function buildBudgetSummary({ totalPrice, budget, adults, currency, adjusted = false, missingFlights = false }) {
  const numericBudget = budget == null ? null : Number(budget);
  const budgetStatus =
    numericBudget == null ? "no_budget_provided" : totalPrice <= numericBudget ? "within_budget" : "over_budget";
  const budgetGap = numericBudget == null ? 0 : Math.max(0, totalPrice - numericBudget);
  return {
    budgetStatus,
    adults,
    flightSubtotalPerPerson: adults > 0 ? totalPrice / adults : totalPrice,
    budgetGap,
    adjustedToCheapestFlights: adjusted,
    culturalPlanRecommended: budgetStatus === "over_budget",
    missingFlights,
    message:
      budgetStatus === "no_budget_provided"
        ? "No hay presupuesto marcado para comparar el viaje."
        : budgetStatus === "within_budget"
          ? "Correcto: los vuelos entran dentro del presupuesto marcado."
          : "El viaje no entra en el presupuesto incluso usando las opciones de vuelo mas baratas encontradas."
  };
}

async function request(path, options = {}) {
  const { authToken, headers: customHeaders = {}, ...fetchOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...customHeaders
    },
    ...fetchOptions
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

export function saveFavoriteItinerary(body, authToken) {
  return request("/favorites", {
    method: "POST",
    authToken,
    body: JSON.stringify(body)
  });
}

export function fetchFavoriteItineraries(authToken) {
  return request("/favorites", {
    method: "GET",
    authToken
  });
}

export function deleteFavoriteItinerary(favoriteId, authToken) {
  return request(`/favorites/${encodeURIComponent(favoriteId)}`, {
    method: "DELETE",
    authToken
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
  const initialStops = legs.map((leg) => ({
    fromCity: leg.fromCity,
    toCity: leg.toCity,
    departureDate: leg.departureDate,
    originAirport: leg.originAirport || null,
    destinationAirport: leg.destinationAirport || null
  }));
  let updatedLegs = await buildLegsForStops({
    stops: initialStops,
    adults,
    cabinClass,
    maxStops
  });
  const initialLegs = updatedLegs.map((leg) => ({ ...leg }));

  const budget = plan?.profile?.budget ?? profile?.budget ?? null;
  const hasBudget = budget != null && Number.isFinite(Number(budget));
  const originCity = profile?.originCity || plan?.profile?.originCity || "";
  let removedCities = [];
  let suggestedSkipCity = null;
  let adaptedMatches = plan.matches || [];
  let adaptedItinerary = plan.itinerary || [];

  if (hasBudget) {
    let selectedFlights = updatedLegs.map((leg) => leg?.recommended).filter(Boolean);
    let totalPrice = totalFlightCost(selectedFlights, adults);
    let guard = 0;

    while (totalPrice > Number(budget) && guard < 6) {
      guard += 1;
      const cityCosts = computeCityFlightCosts(updatedLegs, originCity);
      const sortedCostlyCities = [...cityCosts.entries()].sort((a, b) => b[1] - a[1]);
      const candidate = sortedCostlyCities.find(([city]) => !removedCities.includes(city));
      if (!candidate) break;

      const [cityToSkip] = candidate;
      if (!suggestedSkipCity) suggestedSkipCity = cityToSkip;
      removedCities.push(cityToSkip);

      const remainingMatches = (plan.matches || []).filter(
        (match) => !removedCities.some((removedCity) => normalizeText(removedCity) === normalizeText(match.city || ""))
      );
      if (!remainingMatches.length) break;

      const replannedStops = buildFollowTeamStops(remainingMatches, originCity);
      if (!replannedStops.length) break;
      updatedLegs = await buildLegsForStops({
        stops: replannedStops,
        adults,
        cabinClass,
        maxStops
      });
      selectedFlights = updatedLegs.map((leg) => leg?.recommended).filter(Boolean);
      totalPrice = totalFlightCost(selectedFlights, adults);
      adaptedMatches = remainingMatches;
      adaptedItinerary = (plan.itinerary || []).filter(
        (item) => !removedCities.some((removedCity) => normalizeText(removedCity) === normalizeText(item.location || ""))
      );
    }
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

  const selectedFlights = updatedLegs.map((leg) => leg?.recommended).filter(Boolean);
  const totalPrice = totalFlightCost(selectedFlights, adults);
  const currency = updatedLegs.find((leg) => leg?.recommended?.currency)?.recommended?.currency || "USD";
  const budgetSummary = buildBudgetSummary({
    totalPrice,
    budget,
    adults,
    currency,
    adjusted: true,
    missingFlights: selectedFlights.length < updatedLegs.length
  });
  const adaptationMessage =
    budgetSummary.budgetStatus === "over_budget"
      ? removedCities.length
        ? `No alcanza el presupuesto para seguir todo el itinerario. Para ahorrar, conviene evitar ${suggestedSkipCity || removedCities[0]} y revisar la pestana de planes culturales.`
        : "No alcanza el presupuesto para seguir todo el itinerario. Te recomendamos revisar la pestana de planes culturales."
      : removedCities.length
        ? `Itinerario readaptado para entrar en presupuesto evitando ${removedCities.join(", ")}.`
        : budgetSummary.message;
  const skippedLegs = initialLegs
    .filter(
      (leg) =>
        removedCities.some((city) => normalizeText(city) === normalizeText(leg.fromCity || "")) ||
        removedCities.some((city) => normalizeText(city) === normalizeText(leg.toCity || ""))
    )
    .map((leg) => ({
      ...leg,
      skipped: true,
      reason: "Recortado por presupuesto"
    }));
  const officialFlights = initialLegs.map((leg) => leg?.recommended).filter(Boolean);
  const officialTotalCost = totalFlightCost(officialFlights, adults);

  return {
    ...plan,
    matches: adaptedMatches,
    itinerary: adaptedItinerary,
    followTeamRoute: {
      ...(plan.followTeamRoute || {}),
      legs: updatedLegs,
      segments: updatedSegments,
      skippedLegs
    },
    routeSegments: updatedSegments,
    costs: {
      ...(plan.costs || {}),
      estimatedTotalCost: totalPrice,
      currency,
      ...budgetSummary,
      officialEstimatedTotalCost: officialTotalCost,
      adaptedEstimatedTotalCost: totalPrice,
      overBudgetDestinations: removedCities,
      suggestedSkipDestination: suggestedSkipCity
    },
    recommendationText: totalPrice > 0 ? adaptationMessage : plan.recommendationText,
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
  const adults = Number(profile?.adults ?? plan?.profile?.adults ?? 1);
  const estimatedTotalCost = totalFlightCost(selected ? [selected] : [], adults);
  const currency = selected?.currency || plan?.costs?.currency || "USD";
  const budget = plan?.profile?.budget ?? profile?.budget ?? null;
  const budgetSummary = buildBudgetSummary({
    totalPrice: estimatedTotalCost,
    budget,
    adults,
    currency,
    adjusted: Boolean(selected),
    missingFlights: !selected
  });

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
      ...budgetSummary,
      officialEstimatedTotalCost: estimatedTotalCost,
      adaptedEstimatedTotalCost: estimatedTotalCost
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
