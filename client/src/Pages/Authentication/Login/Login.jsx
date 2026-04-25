import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../../services/API/Api/api";
import { message } from "antd";

const ease = [0.22, 1, 0.36, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.52, delay, ease },
});

const slideVariants = {
  enterFromRight: { opacity: 0, x: 48 },
  center:         { opacity: 1, x: 0 },
  exitToLeft:     { opacity: 0, x: -48 },
};

/* ─────────── OTP Input ─────────── */
function OtpInput({ value, onChange, disabled }) {
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[i]) { next[i] = ""; onChange(next.join("")); }
      else if (i > 0) { next[i - 1] = ""; onChange(next.join("")); refs[i - 1].current?.focus(); }
    } else if (e.key === "ArrowLeft" && i > 0) refs[i - 1].current?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs[i + 1].current?.focus();
  };

  const handleChange = (i, e) => {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    onChange(next.join(""));
    if (ch && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: 48, height: 58,
            textAlign: "center",
            fontSize: 22, fontWeight: 700,
            fontFamily: "'DM Serif Display', serif",
            background: "#fff",
            border: d ? "2px solid #1c1a16" : "1.5px solid #e6e2db",
            borderRadius: 12,
            outline: "none",
            color: "#1c1a16",
            transition: "border-color .15s, box-shadow .15s",
            boxShadow: d ? "0 0 0 3px rgba(28,26,22,.07)" : "none",
            cursor: disabled ? "not-allowed" : "text",
            opacity: disabled ? 0.6 : 1,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────── Main ─────────── */
export default function LoginPage() {
  /* Step 1 state */
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const navigate = useNavigate();


  /* Step 2 state */
  const [otp, setOtp]           = useState("");
  const [timer, setTimer]       = useState(60);
  const [canResend, setCanResend] = useState(false);

  /* Shared */
  const [step, setStep]         = useState(1); // 1 | 2
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  /* Countdown timer for resend */
  useEffect(() => {
    if (step !== 2) return;
    setTimer(60); setCanResend(false);
    const id = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const maskEmail = (e) => {
    const [u, d] = e.split("@");
    return u.slice(0, 2) + "••••" + "@" + d;
  };

  /* Step 1 → request OTP */
  const handleLogin = async (e) => {
    e?.preventDefault(); 
    setError("");
    if (!email)    return setError("Email is required.");
    if (!password) return setError("Password is required.");
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      if (response.data.success) {
        setMaskedEmail(maskEmail(email));
        setStep(2);
      } else {
        setError(response.data.message || "Login failed. Please check your credentials and try again.");
        message.error(response.data.message || "Login failed. Please check your credentials and try again.");
      }
    } catch (error) {
      setError(error.response?.data?.message || "Login failed. Please check your credentials and try again.");
      message.error(error.response?.data?.message || "Network error. Please try again.");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Step 2 → verify OTP */
  const handleVerifyOtp = async () => {
    setError("");
    if (otp.replace(/\s/g,"").length < 6) return setError("Please enter the full 6-digit code.");
    setLoading(true);
    try {
      const response = await api.post("/auth/verify-otp", { email, otp });
      if (response.data.success) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate(response.data.user.isSystemAdmin ? "/admin" : "/dashboard");

      } else {
        setError(response.data.message || "Invalid code. Please try again.");
      }
    } catch (error) {
      message.error( error.response?.data?.message || "Network error. Please try again.");
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Resend OTP */
  const handleResend = async () => {
    if (!canResend) return;
    setError(""); setOtp("");
    try {
      await api.post("/auth/resend-otp", { email });
      setTimer(60); setCanResend(false);
      const id = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(id); setCanResend(true); return 0; }
          return t - 1;
        });
      }, 1000);
    } catch {
      setError("Could not resend code. Please try again.");
    }
  };

  /* ── OTP auto-submit when all 6 digits filled ── */
  useEffect(() => {
    if (step === 2 && otp.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f5f3ef;
        }

        /* ── LEFT ── */
        .left {
          position: relative;
          background: #1c1a16;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 44px 48px;
        }
        .left-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .left-glow-1 {
          position: absolute; border-radius: 50%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(234,179,80,0.15) 0%, transparent 65%);
          top: -160px; right: -160px; pointer-events: none;
        }
        .left-glow-2 {
          position: absolute; border-radius: 50%;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(234,140,60,0.09) 0%, transparent 70%);
          bottom: -60px; left: -60px; pointer-events: none;
        }

        .brand { display: flex; align-items: center; gap: 10px; position: relative; z-index: 1; }
        .brand-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, #eab350, #d4883a);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(234,179,80,0.35);
        }
        .brand-name {
          font-family: 'DM Serif Display', serif;
          font-size: 20px; color: rgba(255,255,255,0.88);
        }
        .left-body { position: relative; z-index: 1; }
        .left-headline {
          font-family: 'DM Serif Display', serif;
          font-size: 46px; line-height: 1.12;
          color: rgba(255,255,255,0.9);
          margin-bottom: 18px; letter-spacing: -0.8px;
        }
        .left-headline em { font-style: italic; color: #eab350; }
        .left-desc { font-size: 14.5px; color: rgba(255,255,255,0.38); line-height: 1.7; max-width: 300px; }
        .left-stats { display: flex; gap: 0; position: relative; z-index: 1; }
        .stat { display: flex; flex-direction: column; gap: 5px; padding-right: 28px; }
        .stat + .stat { padding-left: 28px; border-left: 1px solid rgba(255,255,255,0.1); }
        .stat-n { font-family: 'DM Serif Display', serif; font-size: 30px; color: rgba(255,255,255,0.85); }
        .stat-l { font-size: 11.5px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.7px; }

        /* ── RIGHT ── */
        .right {
          display: flex; align-items: center; justify-content: center;
          padding: 48px 40px; background: #fff;
        }
        .form-wrap { width: 100%; max-width: 390px; }

        .top-row { display: flex; justify-content: flex-end; margin-bottom: 56px; }
        .signup-txt { font-size: 13.5px; color: #999; text-decoration: none; }
        .signup-txt strong { color: #1c1a16; font-weight: 600; border-bottom: 1.5px solid currentColor; padding-bottom: 1px; }

        .f-title { font-family: 'DM Serif Display', serif; font-size: 38px; color: #1c1a16; margin-bottom: 6px; letter-spacing: -0.6px; }
        .f-sub { font-size: 14px; color: #aaa; margin-bottom: 38px; line-height: 1.5; }
        .f-sub strong { color: #555; font-weight: 600; }

        .fields { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 7px; }
        .f-label { font-size: 11px; font-weight: 600; letter-spacing: 0.9px; text-transform: uppercase; color: #aaa; }
        .f-label-row { display: flex; justify-content: space-between; align-items: center; }
        .forgot { font-size: 12px; color: #bbb; text-decoration: none; transition: color .15s; }
        .forgot:hover { color: #1c1a16; }

        .inp-wrap { position: relative; }
        .inp {
          width: 100%; padding: 13px 16px;
          background: #fff; border: 1.5px solid #e6e2db;
          border-radius: 11px; font-size: 15px; font-family: 'DM Sans', sans-serif;
          color: #1c1a16; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .inp::placeholder { color: #ccc; }
        .inp:focus { border-color: #1c1a16; box-shadow: 0 0 0 3px rgba(28,26,22,.07); }
        .inp.pr { padding-right: 46px; }

        .eye {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #ccc; display: flex; padding: 0; transition: color .15s;
        }
        .eye:hover { color: #666; }

        .err {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 13px;
          background: #fff5f5; border: 1px solid #fecaca;
          border-radius: 9px; font-size: 13px; color: #dc2626; margin-top: 6px;
        }

        .btn {
          width: 100%; padding: 14px;
          background: #1c1a16; border: none; border-radius: 11px;
          color: #fff; font-size: 15px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 24px;
          box-shadow: 0 4px 18px rgba(28,26,22,.2);
          transition: background .2s, box-shadow .2s, transform .1s;
        }
        .btn:hover:not(:disabled) { background: #2e2b25; box-shadow: 0 6px 26px rgba(28,26,22,.26); }
        .btn:active:not(:disabled) { transform: scale(0.99); }
        .btn:disabled { opacity: .55; cursor: not-allowed; }

        .btn-ghost {
          width: 100%; padding: 13px;
          background: transparent; border: 1.5px solid #e6e2db; border-radius: 11px;
          color: #888; font-size: 14px; font-weight: 500;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          margin-top: 12px; transition: border-color .15s, color .15s;
        }
        .btn-ghost:hover { border-color: #bbb; color: #444; }

        /* Step indicator */
        .step-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
        .step-dot {
          width: 8px; height: 8px; border-radius: 50%;
          transition: background .3s, transform .3s;
        }
        .step-dot.active { background: #1c1a16; transform: scale(1.2); }
        .step-dot.done { background: #eab350; }
        .step-dot.idle { background: #e0ddd8; }
        .step-line { flex: 1; height: 1px; background: #e6e2db; }
        .step-label { font-size: 11.5px; color: #bbb; letter-spacing: 0.5px; }

        /* Resend row */
        .resend-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 22px; }
        .resend-txt { font-size: 13px; color: #aaa; }
        .resend-btn { font-size: 13px; font-weight: 600; background: none; border: none; font-family: 'DM Sans',sans-serif; cursor: pointer; transition: color .15s; }
        .resend-btn.active { color: #1c1a16; text-decoration: underline; }
        .resend-btn.inactive { color: #ccc; cursor: default; }

        /* OTP success hint */
        .otp-hint { font-size: 12px; color: #bbb; margin-top: 10px; text-align: center; }

        .or-row { display: flex; align-items: center; gap: 12px; margin: 26px 0; }
        .or-line { flex: 1; height: 1px; background: #e6e2db; }
        .or-txt { font-size: 12px; color: #bbb; }
        .socials { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .soc-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 12px; background: #fff; border: 1.5px solid #e6e2db; border-radius: 10px;
          font-size: 13.5px; font-weight: 500; font-family: 'DM Sans', sans-serif; color: #444;
          cursor: pointer; transition: border-color .15s, box-shadow .15s;
        }
        .soc-btn:hover { border-color: #ccc; box-shadow: 0 2px 8px rgba(0,0,0,.05); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }

        @media (max-width: 700px) {
          .root { grid-template-columns: 1fr; }
          .left { display: none; }
        }
      `}</style>

      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="right rounded-2xl shadow-lg border border-gray-200">
          <div className="form-wrap">

            {/* Top row */}
            <motion.div className="top-row" {...fadeUp(0.05)}>
              {step === 1 ? (
                <div className="flex w-full justify-between items-center" >
                  <div className="w-30 h-30" >
                    <img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="" />
                  </div>
                  <span  className="signup-txt">
                    Welcome to <p className="text-gray-800">VEMS</p>
                  </span>
                </div>
              ) : (
                <button
                  className="signup-txt"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => { setStep(1); setOtp(""); setError(""); }}
                >
                  ← <strong>Back to login</strong>
                </button>
              )}
            </motion.div>

            {/* Step indicator */}
            <motion.div className="step-indicator" {...fadeUp(0.1)}>
              <div className={`step-dot ${step === 1 ? "active" : "done"}`} />
              <div className="step-line" />
              <div className={`step-dot ${step === 2 ? "active" : "idle"}`} />
              <span className="step-label">{step === 1 ? "Credentials" : "Verification"}</span>
            </motion.div>

            {/* Animated step panels */}
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  variants={slideVariants}
                  initial="enterFromRight"
                  animate="center"
                  exit="exitToLeft"
                  transition={{ duration: 0.38, ease }}
                >
                  <h1 className="f-title">Sign in</h1>
                  <p className="f-sub">Enter your credentials to access your workspace.</p>

                  <div className="fields">
                    {/* Email */}
                    <div className="field">
                      <label className="f-label">Email address</label>
                      <input
                        className="inp"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLogin();
                          }
                        }}
                      />
                    </div>

                    {/* Password */}
                    <div className="field">
                      <div className="f-label-row">
                        <label className="f-label">Password</label>
                        <a href="/forgot-password" className="forgot">Forgot password?</a>
                      </div>
                      <div className="inp-wrap">
                        <input
                          className="inp pr"
                          type={showPw ? "text" : "password"}
                          placeholder="••••••••••"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setError(""); }}
                          onKeyDown={(e) => {
                              if (e.key === "Enter") {
                              e.preventDefault();
                              handleLogin();
                            }
                          }}
                        />
                        <button className="eye" type="button" onClick={() => setShowPw(!showPw)}>
                          {showPw ? (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div className="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button 
                    className="btn" 
                    type="button" 
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLogin();
                      }
                    }} 
                    onClick={handleLogin}
                    disabled={loading} 
                    whileTap={{ scale: 0.985 }}>
                    {loading ? (
                      <>
                        <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                        </svg>
                        Sending code…
                      </>
                    ) : (
                      <>
                        Continue
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </motion.button>

                </motion.div>

              ) : (
                /* ── STEP 2: OTP ── */
                <motion.div
                  key="step2"
                  variants={slideVariants}
                  initial="enterFromRight"
                  animate="center"
                  exit="exitToLeft"
                  transition={{ duration: 0.38, ease }}
                >
                  {/* Shield icon */}
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease }}
                    style={{
                      width: 52, height: 52,
                      background: "linear-gradient(135deg, #eab350, #d4883a)",
                      borderRadius: 14,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 20,
                      boxShadow: "0 6px 20px rgba(234,179,80,0.3)",
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  </motion.div>

                  <h1 className="f-title">Check your email</h1>
                  <p className="f-sub">
                    We sent a 6-digit code to <strong>{maskedEmail}</strong>. Enter it below to continue.
                  </p>

                  <div style={{ marginBottom: 8 }}>
                    <label className="f-label" style={{ display: "block", marginBottom: 14 }}>Verification code</label>
                    <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(""); }} disabled={loading} />
                  </div>

                  <p className="otp-hint">
                    {otp.length === 6 ? "✓ Verifying automatically…" : `${6 - otp.length} digit${6 - otp.length !== 1 ? "s" : ""} remaining`}
                  </p>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div className="err" style={{ marginTop: 14 }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    className="btn"
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length < 6}
                    whileTap={{ scale: 0.985 }}
                  >
                    {loading ? (
                      <>
                        <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                        </svg>
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify & Sign in
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </motion.button>

                  {/* Resend */}
                  <div className="resend-row">
                    <span className="resend-txt">Didn't receive it?</span>
                    <button
                      className={`resend-btn ${canResend ? "active" : "inactive"}`}
                      onClick={handleResend}
                      disabled={!canResend}
                    >
                      {canResend ? "Resend code" : `Resend in ${timer}s`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </>
  );
}