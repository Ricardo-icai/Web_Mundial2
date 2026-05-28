const airlineCodes = new Map([
  ["aeromexico", "AM"],
  ["air canada", "AC"],
  ["air europa", "UX"],
  ["air france", "AF"],
  ["air serbia", "JU"],
  ["american", "AA"],
  ["american airlines", "AA"],
  ["british airways", "BA"],
  ["delta", "DL"],
  ["delta air lines", "DL"],
  ["iberia", "IB"],
  ["klm", "KL"],
  ["lufthansa", "LH"],
  ["tap air portugal", "TP"],
  ["turkish airlines", "TK"],
  ["united", "UA"],
  ["united airlines", "UA"]
]);

function normalizeAirline(value = "") {
  return value.toString().trim().toLowerCase();
}

function airlineCode(flight) {
  const rawCode = flight?.carrierCode || "";
  if (/^[A-Z0-9]{2}$/i.test(rawCode)) return rawCode.toUpperCase();
  const name = normalizeAirline(flight?.airline || rawCode);
  return airlineCodes.get(name) || null;
}

export function AirlineBadge({ flight }) {
  const airline = flight?.airline || flight?.carrierCode || "Aerolinea por confirmar";
  const code = airlineCode(flight);
  const initials = airline
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
        {code ? (
          <img
            src={`https://images.kiwi.com/airlines/64/${code}.png`}
            alt={`Logo de ${airline}`}
            className="h-8 w-8 object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-xs font-black text-brandBlue">{initials || "AV"}</span>
        )}
      </span>
      <span className="min-w-0 truncate">{airline}</span>
    </span>
  );
}

export default function FlightCard({ label, flight, adults = 1 }) {
  if (!flight) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Sin datos</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-xl font-semibold">
        {flight.price} {flight.currency}
      </p>
      {adults > 1 && (
        <p className="text-sm font-semibold text-slate-600">
          Total {adults} viajeros: {Number(flight.price || 0) * adults} {flight.currency}
        </p>
      )}
      <p className="text-sm text-slate-600">
        {flight.originIata} - {flight.destinationIata} | {flight.departureDate}
      </p>
      <p className="text-sm text-slate-600">
        Duracion: {flight.duration} | Escalas: {flight.stops}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-700">
        <AirlineBadge flight={flight} />
      </p>
      {flight.stopoverAirports?.length > 0 && (
        <p className="text-sm text-slate-600">Escalas en: {flight.stopoverAirports.join(", ")}</p>
      )}
    </div>
  );
}
