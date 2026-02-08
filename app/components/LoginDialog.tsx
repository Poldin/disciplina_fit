"use client";

import { useState } from "react";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nell\'invio del codice');
      }

      // TEST MODE: se WhatsApp fallisce, l'API restituisce il codice OTP
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp);
      }

      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'invio del codice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phoneNumber,
          otp: otp 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Codice OTP non valido');
      }

      // Mostra messaggio di successo
      setSuccessMessage(data.message || 'Accesso effettuato!');
      
      // Chiudi il dialog dopo un breve delay
      setTimeout(() => {
        handleClose();
        window.location.reload(); // Ricarica per aggiornare la sessione
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella verifica del codice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("phone");
    setPhoneNumber("");
    setOtp("");
    setIsLoading(false);
    setError(null);
    setSuccessMessage(null);
    setDebugOtp(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 border border-zinc-200 dark:border-zinc-800">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {step === "phone" ? "Accedi a disciplinaFit" : "Verifica il tuo numero"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {step === "phone" 
              ? "Inserisci il tuo numero di telefono per continuare"
              : `Abbiamo inviato un codice via WhatsApp al ${phoneNumber}`
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* Phone Step */}
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="phone" 
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
              >
                Numero di telefono
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+39 123 456 7890"
                required
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Invio in corso..." : "Invia codice via WhatsApp"}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            {/* TEST MODE: mostra OTP se WhatsApp non disponibile */}
            {debugOtp && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                <p className="font-medium mb-1">Modalità test</p>
                <p>WhatsApp non disponibile. Il tuo codice OTP è: <span className="font-mono font-bold text-lg">{debugOtp}</span></p>
              </div>
            )}
            <div>
              <label 
                htmlFor="otp" 
                className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
              >
                Codice OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifica in corso..." : "Verifica codice"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              ← Cambia numero
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
