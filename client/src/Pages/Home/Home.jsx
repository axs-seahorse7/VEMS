import { useState, useEffect } from "react";

const LOGO_URL = "https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png";

// ── Emerald palette ──────────────────────────────────────────────────────────
const E = {
  50:  "#ecfdf5",
  100: "#d1fae5",
  200: "#a7f3d0",
  300: "#6ee7b7",
  400: "#34d399",
  500: "#10b981",
  600: "#059669",
  700: "#047857",
  800: "#065f46",
  900: "#064e3b",
};

const features = [
  {
    icon: "🛡️",
    title: "Secure Entry Control",
    desc: "Gate-level authentication with real-time verification for every vehicle movement.",
  },
  {
    icon: "📍",
    title: "Live Tracking",
    desc: "Monitor your entire fleet position and status across all company premises.",
  },
  {
    icon: "📑",
    title: "Smart Reports",
    desc: "Auto-generated compliance logs, usage analytics, and audit-ready exports.",
  },
  {
    icon: "🔔",
    title: "Instant Alerts",
    desc: "Push notifications for unauthorized access, overdue returns, and incidents.",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setVisible(true);
    const scrollHandler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", scrollHandler);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => {
      window.removeEventListener("scroll", scrollHandler);
      clearInterval(timer);
    };
  }, []);

  const timeString = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateString = time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={styles.root}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }`}</style>

      {/* Ambient background blobs */}
      <div style={styles.blobPrimary} />
      <div style={styles.blobSecondary} />
      <div style={styles.blobSoft} />

      {/* Nav */}
      <nav style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
        <div style={styles.navInner}>
          <div style={styles.logoGroup}>
            <img src={LOGO_URL} alt="PG Logo" style={styles.logoImg} />
            <div>
              <div style={styles.logoTitle}>VEMS</div>
              <div style={styles.logoSub}>Vehicle Entry Management</div>
            </div>
          </div>
          <div style={styles.navRight}>
            <div style={styles.liveChip}>
              <span style={styles.liveDot} />
              Live
            </div>
            <div style={styles.navTime}>{timeString}</div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="px-40 py-40 flex items-center justify-center"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <div style={styles.heroBadge}>
            <span style={styles.heroBadgeDot} />
            Internal Fleet Management Platform
          </div>

          <h1 className="text-6xl font-extrabold text-center mb-5" style={styles.heroTitle}>
            Vehicle Entry
            <span style={{ color: E[600] }}> Management System</span>
          </h1>

          <p className="text-lg text-center mb-8" style={{ color: "#4b5563", maxWidth: 720 }}>
            Seamlessly manage, track, and authorize every vehicle movement within your company premises — all from a single intelligent dashboard.
          </p>

          <div style={styles.heroDateRow}>
            <span style={styles.heroDate}>{dateString}</span>
          </div>

          {/* CTA */}
          <div style={styles.ctaRow}>
            <button
              style={styles.btnPrimary}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(5,150,105,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(5,150,105,0.25)";
              }}
              onClick={() => (window.location.href = "/dashboard")}
            >
              <span>Go to Dashboard</span>
              <span style={styles.btnArrow}>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.featuresSection}>
        <div style={styles.sectionLabel}>Platform Capabilities</div>
        <h2 style={styles.sectionTitle}>Everything you need, <br />nothing you don't</h2>
        <div style={styles.featuresGrid}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                ...styles.featureCard,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.8s ease ${0.3 + i * 0.12}s, transform 0.8s ease ${0.3 + i * 0.12}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 20px 50px rgba(5,150,105,0.14)";
                e.currentTarget.style.borderColor = E[300];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 16px rgba(6,78,59,0.06)";
                e.currentTarget.style.borderColor = E[100];
              }}
            >
              <div style={styles.featureIcon}>{f.icon}</div>
              <div style={styles.featureTitle}>{f.title}</div>
              <div style={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Strip */}
      <section style={styles.ctaStrip}>
        <div style={styles.ctaStripInner}>
          <div>
            <div style={styles.ctaStripTitle}>Ready to take control?</div>
            <div style={styles.ctaStripSub}>Sign in to access your company's vehicle management dashboard.</div>
          </div>
          <button
            style={styles.btnPrimaryLg}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            onClick={() => (window.location.href = "/login")}
          >
            Go to Login →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>
            <img src={LOGO_URL} alt="PG" style={{ height: 44, objectFit: "contain" }} />
            <span style={styles.footerBrand}>VEMS</span>
          </div>
          <div style={styles.footerText}>
            © {new Date().getFullYear()} All Rights Reserved by PG Electroplast Ltd. Made with ❤️ and Passion
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#f3fbf7",
    color: "#052e22",
    minHeight: "100vh",
    overflowX: "hidden",
    position: "relative",
  },
  blobPrimary: {
    position: "fixed", top: -160, right: -120, width: 560, height: 560,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  blobSecondary: {
    position: "fixed", top: 200, left: -180, width: 500, height: 500,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  blobSoft: {
    position: "fixed", bottom: 0, right: 100, width: 400, height: 400,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(110,231,183,0.12) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },

  /* Nav */
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    padding: "0 24px",
    transition: "background 0.3s ease, box-shadow 0.3s ease",
  },
  navScrolled: {
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: `0 1px 0 ${E[100]}`,
  },
  navInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 80,
  },
  logoGroup: { display: "flex", alignItems: "center", gap: 14 },
  // no background box — the logo sits directly on the page, larger than before
  logoImg: { height: 56, width: "auto", objectFit: "contain", display: "block" },
  logoTitle: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: E[900] },
  logoSub: { fontSize: 10, color: E[600], letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  liveChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: E[100], color: E[700],
    fontSize: 12, fontWeight: 600,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: E[500],
    boxShadow: "0 0 0 2px rgba(16,185,129,0.3)",
    animation: "pulse 2s infinite",
    display: "inline-block",
  },
  navTime: { fontSize: 13, fontWeight: 600, color: E[800], letterSpacing: "0.02em" },

  /* Hero */
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "6px 14px", borderRadius: 20,
    background: E[100], color: E[700],
    fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
    textTransform: "uppercase", marginBottom: 24,
  },
  heroBadgeDot: {
    width: 6, height: 6, borderRadius: "50%", background: E[500],
    display: "inline-block",
  },
  heroTitle: {
    fontSize: 56, fontWeight: 800, lineHeight: 1.08,
    letterSpacing: "-0.04em", marginBottom: 20, color: E[900],
  },
  heroDateRow: { marginBottom: 36 },
  heroDate: { fontSize: 13, color: E[700], fontWeight: 500, opacity: 0.8 },

  ctaRow: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  btnPrimary: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 28px", borderRadius: 16,
    background: `linear-gradient(135deg, ${E[500]} 0%, ${E[700]} 100%)`,
    color: "white", fontSize: 15, fontWeight: 700,
    border: "none", cursor: "pointer",
    boxShadow: "0 6px 24px rgba(5,150,105,0.25)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    letterSpacing: "-0.01em",
  },
  btnArrow: { fontSize: 18 },

  /* Features */
  featuresSection: {
    maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px",
    position: "relative", zIndex: 1, textAlign: "center",
  },
  sectionLabel: {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: E[600], marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em",
    color: E[900], marginBottom: 48, lineHeight: 1.15,
  },
  featuresGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20,
    textAlign: "left",
  },
  featureCard: {
    background: "white", borderRadius: 20, padding: 28,
    boxShadow: "0 2px 16px rgba(6,78,59,0.06)",
    border: `1px solid ${E[100]}`,
    cursor: "default",
  },
  featureIcon: { fontSize: 32, marginBottom: 16 },
  featureTitle: { fontSize: 16, fontWeight: 700, color: E[900], marginBottom: 10 },
  featureDesc: { fontSize: 14, lineHeight: 1.6, color: "#4b6358" },

  /* CTA Strip */
  ctaStrip: {
    background: `linear-gradient(135deg, ${E[800]} 0%, ${E[600]} 100%)`,
    padding: "60px 24px",
    position: "relative", zIndex: 1,
  },
  ctaStripInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 32, flexWrap: "wrap",
  },
  ctaStripTitle: {
    fontSize: 28, fontWeight: 800, color: "white",
    letterSpacing: "-0.03em", marginBottom: 8,
  },
  ctaStripSub: { fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 },
  btnPrimaryLg: {
    padding: "16px 32px", borderRadius: 16, flexShrink: 0,
    background: "white", color: E[800],
    fontSize: 15, fontWeight: 800,
    border: "none", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease",
    letterSpacing: "-0.01em",
  },

  /* Footer */
  footer: {
    background: E[50], borderTop: `1px solid ${E[100]}`,
    padding: "32px 24px",
    position: "relative", zIndex: 1,
  },
  footerInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
  },
  footerLogo: { display: "flex", alignItems: "center", gap: 12 },
  footerBrand: { fontSize: 16, fontWeight: 800, color: E[900], letterSpacing: "-0.02em" },
  footerText: { fontSize: 13, color: E[700] },
};