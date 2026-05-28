import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogIn, LogOut, Star, Trash2, UserCircle2, UserPlus } from "lucide-react";
import {
  deleteFavoriteItinerary,
  fetchFavoriteItineraries,
  loginUser,
  registerUser
} from "../services/api.client.js";
import { usePlannerStore } from "../store/planner.store.js";

const modes = {
  login: "login",
  register: "register"
};

function formatShortDate(value) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return new Intl.DateTimeFormat("es-ES", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function AuthPanel() {
  const navigate = useNavigate();
  const { authUser, authToken, setAuth, logoutAuth, setPlan, setProfile } = usePlannerStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(modes.login);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const [deletingFavoriteId, setDeletingFavoriteId] = useState("");
  const menuRef = useRef(null);

  const resetForm = () => {
    setForm({ username: "", email: "", password: "" });
    setError("");
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const normalizedPassword = form.password;
      if (!normalizedEmail || !normalizedPassword) {
        throw new Error("Email y contrasena son obligatorios.");
      }
      if (normalizedPassword.length < 6) {
        throw new Error("La contrasena debe tener al menos 6 caracteres.");
      }

      const fallbackUsername = normalizedEmail.split("@")[0]?.trim() || "usuario";
      const normalizedUsername = (form.username || "").trim() || fallbackUsername;

      const payload =
        mode === modes.register
          ? { username: normalizedUsername, email: normalizedEmail, password: normalizedPassword }
          : { email: normalizedEmail, password: normalizedPassword };

      const response = mode === modes.register ? await registerUser(payload) : await loginUser(payload);
      setAuth({ user: response.user, token: response.token });
      setOpen(false);
      resetForm();
    } catch (requestError) {
      setError(requestError.message || "No se pudo completar la autenticacion.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!menuOpen || !authToken) return;

    let active = true;
    setLoadingFavorites(true);
    setFavoritesError("");
    fetchFavoriteItineraries(authToken)
      .then((response) => {
        if (!active) return;
        setFavorites(response?.favorites || []);
      })
      .catch((requestError) => {
        if (!active) return;
        setFavoritesError(requestError.message || "No se pudieron cargar tus favoritos.");
      })
      .finally(() => {
        if (active) setLoadingFavorites(false);
      });

    return () => {
      active = false;
    };
  }, [menuOpen, authToken]);

  useEffect(() => {
    if (!menuOpen) return;

    const onDocumentClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [menuOpen]);

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
    setMenuOpen(false);
    navigate("/itinerary");
  };

  const onDeleteFavorite = async (event, favoriteId) => {
    event.stopPropagation();
    if (!favoriteId || !authToken || deletingFavoriteId) return;

    setDeletingFavoriteId(favoriteId);
    setFavoritesError("");
    try {
      await deleteFavoriteItinerary(favoriteId, authToken);
      setFavorites((prev) => prev.filter((favorite) => favorite.id !== favoriteId));
    } catch (requestError) {
      setFavoritesError(requestError.message || "No se pudo borrar el favorito.");
    } finally {
      setDeletingFavoriteId("");
    }
  };

  if (authUser) {
    return (
      <div ref={menuRef} className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 ring-1 ring-white/10 backdrop-blur-xl"
        >
          <UserCircle2 size={18} />
          <span className="max-w-32 truncate">{authUser.username}</span>
          <ChevronDown size={16} className={menuOpen ? "rotate-180" : ""} />
        </button>

        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            logoutAuth();
            navigate("/");
          }}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-xs font-black uppercase tracking-wide text-white"
        >
          <LogOut size={14} />
          Logout
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-[160] mt-2 w-[min(92vw,34rem)] rounded-md border border-cyan-100/30 bg-[#06182a]/95 p-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-cyan-200">
              <Star size={14} />
              Itinerarios favoritos
            </div>

            {loadingFavorites && <p className="text-sm text-white/70">Cargando favoritos...</p>}
            {!loadingFavorites && favoritesError && <p className="text-sm font-semibold text-amber-300">{favoritesError}</p>}

            {!loadingFavorites && !favoritesError && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/favorites");
                }}
                disabled={favorites.length === 0}
                className="mb-3 inline-flex w-full items-center justify-center rounded-md border border-cyan-100/25 bg-cyan-200 px-3 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {favorites.length > 0 ? `Ver itinerarios favoritos (${favorites.length})` : "No tienes favoritos guardados"}
              </button>
            )}

            {!loadingFavorites && !favoritesError && favorites.length === 0 && (
              <p className="text-sm text-white/70">Aun no tienes favoritos guardados.</p>
            )}

            {!loadingFavorites && !favoritesError && favorites.length > 0 && (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="rounded-md border border-cyan-100/20 bg-[#0b2238]/70 p-3"
                  >
                    <p className="text-sm font-black text-white">{favorite.title || "Itinerario"}</p>
                    <p className="mt-1 text-xs font-semibold text-white/70">
                      {favorite.originCity || "Origen"}
                      {" -> "}
                      {favorite.destinationCity || "Destino"}
                      {" | "}
                      {formatShortDate(favorite.departureDate)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openFavorite(favorite)}
                        className="rounded-md bg-cyan-200 px-3 py-1.5 text-xs font-black text-slate-950"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={(event) => onDeleteFavorite(event, favorite.id)}
                        disabled={deletingFavoriteId === favorite.id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-300/40 px-3 py-1.5 text-xs font-black text-red-200 disabled:opacity-60"
                      >
                        <Trash2 size={12} />
                        {deletingFavoriteId === favorite.id ? "Borrando..." : "Borrar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 ring-1 ring-white/10 backdrop-blur-xl"
          onClick={() => {
            setMode(modes.register);
            setOpen(true);
          }}
        >
          <UserPlus size={16} />
          Registro
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 ring-1 ring-white/10 backdrop-blur-xl"
          onClick={() => {
            setMode(modes.login);
            setOpen(true);
          }}
        >
          <LogIn size={16} />
          Login
        </button>
      </div>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-slate-950/65 p-4 sm:p-6">
            <div className="w-full max-w-md rounded-lg border border-cyan-100/25 bg-[#071827]/95 p-5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl">
              <h2 className="text-xl font-black">{mode === modes.register ? "Crear cuenta" : "Iniciar sesion"}</h2>
              <p className="mt-1 text-sm text-white/70">
                {mode === modes.register ? "Registra tu usuario para guardar sesion." : "Accede con tu email y contrasena."}
              </p>

              <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
                {mode === modes.register && (
                  <label className="block text-sm font-bold">
                    Nombre de usuario (opcional)
                    <input
                      name="username"
                      value={form.username}
                      onChange={onChange}
                      className="mt-1 w-full rounded-md border border-white/20 bg-white/90 px-3 py-2 text-slate-950 outline-none"
                    />
                  </label>
                )}

                <label className="block text-sm font-bold">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    className="mt-1 w-full rounded-md border border-white/20 bg-white/90 px-3 py-2 text-slate-950 outline-none"
                  />
                </label>

                <label className="block text-sm font-bold">
                  Contrasena
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    minLength={6}
                    required
                    className="mt-1 w-full rounded-md border border-white/20 bg-white/90 px-3 py-2 text-slate-950 outline-none"
                  />
                </label>

                {error && <p className="text-sm font-semibold text-amber-300">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-cyan-200 px-3 text-sm font-black text-slate-950 disabled:opacity-60"
                  >
                    {submitting ? "Procesando..." : mode === modes.register ? "Registrarme" : "Entrar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-white/20 px-3 text-sm font-black text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === modes.login ? modes.register : modes.login));
                  setError("");
                }}
                className="mt-4 text-sm font-bold text-cyan-200 underline"
              >
                {mode === modes.login ? "No tengo cuenta, quiero registrarme" : "Ya tengo cuenta, quiero hacer login"}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
