import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../../../services/API/Api/api";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    setLoading(true);
    try {
      const response = await api.post("/auth/login",{ email, password });
      if(response.data.success){
          if (response.data.user.isSystemAdmin) {
            window.location.href = "/admin";
            localStorage.setItem("user", JSON.stringify(response.data.user));
          } else {
            window.location.href = "/dashboard";
            localStorage.setItem("user", JSON.stringify(response.data.user));
          }
      } else {
        setError(response.data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #f5f3ef;
        }

        /* LEFT */
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
          margin-bottom: 18px;
          letter-spacing: -0.8px;
        }
        .left-headline em { font-style: italic; color: #eab350; }
        .left-desc {
          font-size: 14.5px; color: rgba(255,255,255,0.38);
          line-height: 1.7; max-width: 300px;
        }

        .left-stats { display: flex; gap: 0; position: relative; z-index: 1; }
        .stat { display: flex; flex-direction: column; gap: 5px; padding-right: 28px; }
        .stat + .stat { padding-left: 28px; border-left: 1px solid rgba(255,255,255,0.1); }
        .stat-n {
          font-family: 'DM Serif Display', serif;
          font-size: 30px; color: rgba(255,255,255,0.85);
        }
        .stat-l { font-size: 11.5px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.7px; }

        /* RIGHT */
        .right {
          display: flex; align-items: center; justify-content: center;
          padding: 48px 40px; background: #f5f3ef;
        }
        .form-wrap { width: 100%; max-width: 390px; }

        .top-row { display: flex; justify-content: flex-end; margin-bottom: 56px; }
        .signup-txt { font-size: 13.5px; color: #999; text-decoration: none; }
        .signup-txt strong { color: #1c1a16; font-weight: 600; border-bottom: 1.5px solid currentColor; padding-bottom: 1px; }

        .f-title {
          font-family: 'DM Serif Display', serif;
          font-size: 38px; color: #1c1a16;
          margin-bottom: 6px; letter-spacing: -0.6px;
        }
        .f-sub { font-size: 14px; color: #aaa; margin-bottom: 38px; line-height: 1.5; }

        .fields { display: flex; flex-direction: column; gap: 18px; }

        .field { display: flex; flex-direction: column; gap: 7px; }
        .f-label {
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.9px; text-transform: uppercase; color: #aaa;
        }
        .f-label-row { display: flex; justify-content: space-between; align-items: center; }
        .forgot { font-size: 12px; color: #bbb; text-decoration: none; transition: color .15s; }
        .forgot:hover { color: #1c1a16; }

        .inp-wrap { position: relative; }
        .inp {
          width: 100%; padding: 13px 16px;
          background: #fff;
          border: 1.5px solid #e6e2db;
          border-radius: 11px;
          font-size: 15px; font-family: 'DM Sans', sans-serif;
          color: #1c1a16; outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .inp::placeholder { color: #ccc; }
        .inp:focus {
          border-color: #1c1a16;
          box-shadow: 0 0 0 3px rgba(28,26,22,.07);
        }
        .inp.pr { padding-right: 46px; }

        .eye {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #ccc; display: flex; padding: 0; transition: color .15s;
        }
        .eye:hover { color: #666; }

        .err {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 13px;
          background: #fff5f5; border: 1px solid #fecaca;
          border-radius: 9px; font-size: 13px; color: #dc2626;
          margin-top: 6px;
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
        .btn:hover:not(:disabled) {
          background: #2e2b25;
          box-shadow: 0 6px 26px rgba(28,26,22,.26);
        }
        .btn:active:not(:disabled) { transform: scale(0.99); }
        .btn:disabled { opacity: .55; cursor: not-allowed; }

        .or-row { display: flex; align-items: center; gap: 12px; margin: 26px 0; }
        .or-line { flex: 1; height: 1px; background: #e6e2db; }
        .or-txt { font-size: 12px; color: #bbb; }

        .socials { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .soc-btn {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 12px; background: #fff;
          border: 1.5px solid #e6e2db; border-radius: 10px;
          font-size: 13.5px; font-weight: 500;
          font-family: 'DM Sans', sans-serif; color: #444;
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

      <div className="flex items-center justify-center min-h-screen bg-gray-100 ">

        {/* ── Right ── */}
        <div className="right rounded-2xl shadow-lg border border-gray-200">
          <div className="form-wrap">

            <motion.div className="top-row" {...fadeUp(0.1)}>
              <a href="/register" className="signup-txt">
                New here? <strong>Create account</strong>
              </a>
            </motion.div>

            <motion.h1 className="f-title" {...fadeUp(0.15)}>Sign in</motion.h1>
            <motion.p className="f-sub" {...fadeUp(0.2)}>
              Enter your credentials to access your workspace.
            </motion.p>

            <motion.div {...fadeUp(0.25)}>
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
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <button className="eye" type="button" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
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
                  <motion.div
                    className="err"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              <motion.button
                className="btn"
                onClick={handleLogin}
                disabled={loading}
                whileTap={{ scale: 0.985 }}
              >
                {loading ? (
                  <>
                    <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                    </svg>
                    Signing in…
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

              {/* Social */}
              <div className="or-row">
                <div className="or-line" /><span className="or-txt">or continue with</span><div className="or-line" />
              </div>

              <div className="socials">
                <button className="soc-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button className="soc-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#1c1a16">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}