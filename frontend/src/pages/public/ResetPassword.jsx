// ============================================================================
// Stranica na koju vodi link iz "reset lozinke" e-maila (poslat iz Login/Forgot
// toka ili preko admin panela). Supabase, nakon klika na link, sam postavi
// privremenu sesiju (PASSWORD_RECOVERY event) - ovdje samo tražimo NOVU lozinku
// i pozivamo supabase.auth.updateUser({ password }).
// ============================================================================

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import ParticleBackground from "../../components/shared/ParticleBackground";
import { supabase } from "../../services/SupaBaseClient";
import { Lock, KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accentColor = theme.accent;

  const [ready, setReady] = useState(false); // da li Supabase prepoznao recovery sesiju
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase parsira token iz URL-a i emituje PASSWORD_RECOVERY čim se
    // stranica učita preko linka iz maila.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // ako je token već obrađen prije nego se listener stigao zakačiti
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("auth.resetPassword.errorTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.errorMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setSuccess(true);
    } catch (err) {
      setError(err.message || t("auth.resetPassword.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bgGradient} bg-grain relative z-0 flex items-center justify-center transition-all duration-500 py-12 px-4 overflow-hidden`}>
      <ParticleBackground colors={theme.particleColors} />
      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          <Card className="p-8 sm:p-10 shadow-2xl border-opacity-20 relative overflow-hidden">
            <div className="text-center mb-8 relative z-10">
              <div className={`flex justify-center mb-4 ${accentColor}`}>
                <KeyRound size={48} strokeWidth={1.5} />
              </div>
              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${theme.text}`}>
                {t("auth.resetPassword.title")}
              </h1>
              <p className={`${theme.muted} mt-2 font-medium`}>
                {t("auth.resetPassword.subtitle")}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2">
                <AlertCircle size={18} />
                <span className="text-sm font-semibold">{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center text-green-500">
                  <CheckCircle2 size={48} />
                </div>
                <p className={theme.muted}>{t("auth.resetPassword.successMessage")}</p>
                <Button onClick={() => navigate("/login")} className="w-full h-12">
                  {t("auth.resetPassword.loginBtn")}
                </Button>
              </div>
            ) : !ready ? (
              <p className={`text-center text-sm ${theme.muted}`}>
                {t("auth.resetPassword.checkingLink")}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                  <Input
                    type="password"
                    placeholder={t("auth.resetPassword.newPasswordPh")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-opacity-50"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-gray-400 z-20" size={18} />
                  <Input
                    type="password"
                    placeholder={t("auth.resetPassword.confirmPasswordPh")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-opacity-50"
                    required
                  />
                </div>
                <Button type="submit" className={`w-full mt-2 h-12 shadow-lg ${theme.button} !text-white font-bold`}>
                  {loading ? <Loader2 className="animate-spin mx-auto" /> : t("auth.resetPassword.saveBtn")}
                </Button>
              </form>
            )}
          </Card>

          <div className="text-center mt-8 relative z-10">
            <button
              onClick={() => navigate("/")}
              className={`${theme.muted} flex items-center gap-2 mx-auto hover:opacity-80 transition-opacity text-sm font-bold`}
            >
              <ArrowLeft size={16} />
              {t("auth.resetPassword.backHome")}
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
