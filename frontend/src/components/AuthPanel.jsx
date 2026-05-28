import { useState } from "react";
import { createPortal } from "react-dom";
import { LogIn, UserPlus, UserCircle2 } from "lucide-react";
import { loginUser, registerUser } from "../services/api.client.js";
import { usePlannerStore } from "../store/planner.store.js";

const modes = {
  login: "login",
  register: "register"
};

export default function AuthPanel() {
  const { authUser, setAuth, logoutAuth } = usePlannerStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(modes.login);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  if (authUser) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex h-11 items-center gap-2 rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-sm font-black text-white shadow-lg shadow-cyan-950/30 ring-1 ring-white/10 backdrop-blur-xl">
          <UserCircle2 size={18} />
          <span className="max-w-32 truncate">{authUser.username}</span>
        </div>
        <button
          type="button"
          onClick={logoutAuth}
          className="inline-flex h-11 items-center rounded-md border border-cyan-100/25 bg-[#0b2238]/85 px-3 text-xs font-black uppercase tracking-wide text-white"
        >
          Logout
        </button>
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
