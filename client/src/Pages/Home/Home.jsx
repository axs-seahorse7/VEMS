import { useState, useEffect } from "react";

const stats = [
  { label: "Active Vehicles", value: "48", icon: "🚗", trend: "+3 today" },
  { label: "Entries Today", value: "124", icon: "📋", trend: "+12 this hour" },
  { label: "Pending Approvals", value: "7", icon: "⏳", trend: "2 urgent" },
  { label: "Fleet Utilization", value: "82%", icon: "📊", trend: "+5% this week" },
];

const recentActivity = [
  { vehicle: "MH-12 AB 4521", driver: "Rajesh Kumar", time: "2 min ago", status: "entered", type: "SUV" },
  { vehicle: "MH-12 CD 7890", driver: "Priya Sharma", time: "14 min ago", status: "exited", type: "Sedan" },
  { vehicle: "MH-14 EF 1023", driver: "Amit Patel", time: "31 min ago", status: "entered", type: "Truck" },
  { vehicle: "MH-12 GH 5544", driver: "Sunita Rao", time: "1 hr ago", status: "exited", type: "Van" },
];

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
      {/* Ambient background blobs */}
      <div style={styles.blobBlue} />
      <div style={styles.blobIndigo} />
      <div style={styles.blobGray} />

      {/* Nav */}
      <nav style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
        <div style={styles.navInner}>
          <div style={styles.logoGroup}>
            <div style={styles.logoImgWrap}>
              <img
                src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
                alt="VEMS Logo"
                style={styles.logoImg}
              />
            </div>
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
      // style={styles.hero}
      className="px-40 py-40 flex items-center justify-center "
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}>

          {/* <div style={styles.heroLogoLarge}>
            <img
              src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png"
              alt="VEMS"
              style={styles.heroLogoImg}
            />
          </div> */}

          <div style={styles.heroBadge}>
            <span style={styles.heroBadgeDot} />
            Internal Fleet Management Platform
          </div>

          <h1 className="text-6xl font-extrabold text-center mb-5" style={styles.heroTitle}>
            Smarter Vehicle
            <span className="text-blue-600 mt-1" > Entry Control</span>
          </h1>

          <p  className="text-lg text-gray-600 text-center mb-8" >
            Seamlessly manage, track, and authorize every vehicle movement within your company premises — all from a single intelligent dashboard.
          </p>

          <div style={styles.heroDateRow}>
            <span style={styles.heroDate}>{dateString}</span>
          </div>

          {/* CTA */}
          <div style={styles.ctaRow}>
            <button
              style={styles.btnPrimary}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.04)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(59,130,246,0.35)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(59,130,246,0.22)";
              }}
              onClick={() => window.location.href = "/login"}
            >
              <span>Go to Login</span>
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
              style={{ ...styles.featureCard, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.8s ease ${0.3 + i * 0.12}s, transform 0.8s ease ${0.3 + i * 0.12}s` }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.09)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(0,0,0,0.05)"; }}
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
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            onClick={() => window.location.href = "/login"}
          >
            Go to Login →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>
            <img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="VEMS" style={{ height: 28, objectFit: "contain" }} />
            <span style={styles.footerBrand}>VEMS</span>
          </div>
          <div style={styles.footerText}>© {new Date().getFullYear()} All Rights Reserved by PG Electroplast Ltd. Made with ❤️ and Passion</div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#f5f7fa",
    color: "#0f172a",
    minHeight: "100vh",
    overflowX: "hidden",
    position: "relative",
  },
  blobBlue: {
    position: "fixed", top: -160, right: -120, width: 560, height: 560,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  blobIndigo: {
    position: "fixed", top: 200, left: -180, width: 500, height: 500,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  blobGray: {
    position: "fixed", bottom: 0, right: 100, width: 400, height: 400,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(148,163,184,0.07) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },

  /* Nav */
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
    padding: "0 24px",
    transition: "background 0.3s ease, backdropFilter 0.3s ease, boxShadow 0.3s ease",
  },
  navScrolled: {
    background: "rgba(255,255,255,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
  },
  navInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 64,
  },
  logoGroup: { display: "flex", alignItems: "center", gap: 12 },
  logoImgWrap: {
    width: 40, height: 40, borderRadius: 12,
    background: "white", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    overflow: "hidden",
  },
  logoImg: { width: 32, height: 32, objectFit: "contain" },
  logoTitle: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" },
  logoSub: { fontSize: 10, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  liveChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 20,
    background: "#dcfce7", color: "#15803d",
    fontSize: 12, fontWeight: 600,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#22c55e",
    boxShadow: "0 0 0 2px rgba(34,197,94,0.3)",
    animation: "pulse 2s infinite",
    display: "inline-block",
  },
  navTime: { fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.02em" },

  /* Hero */
  hero: {
    maxWidth: 1200, margin: "0 auto", padding: "120px 24px 80px",
    display: "flex", alignItems: "center", justifyContent: "start",
    gap: 48, flexWrap: "wrap",
    position: "relative", zIndex: 1,
  },
  heroContent: { flex: "1 1 480px", maxWidth: 560 },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "6px 14px", borderRadius: 20,
    background: "rgba(59,130,246,0.10)", color: "#2563eb",
    fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
    textTransform: "uppercase", marginBottom: 24,
  },
  heroBadgeDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#3b82f6",
    display: "inline-block",
  },
  heroLogoLarge: {
    width: 72, height: 72, borderRadius: 20,
    background: "white", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)", marginBottom: 28, overflow: "hidden",
  },
  heroLogoImg: { width: 56, height: 56, objectFit: "contain" },
  heroTitle: {
    fontSize: 56, fontWeight: 800, lineHeight: 1.08,
    letterSpacing: "-0.04em", marginBottom: 20, color: "#0f172a",
  },
  heroAccent: {
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroDesc: {
    fontSize: 17, lineHeight: 1.65, color: "#64748b",
    marginBottom: 24, maxWidth: 460,
  },
  heroDateRow: { marginBottom: 36 },
  heroDate: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },

  ctaRow: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  btnPrimary: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "14px 28px", borderRadius: 16,
    background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    color: "white", fontSize: 15, fontWeight: 700,
    border: "none", cursor: "pointer",
    boxShadow: "0 6px 24px rgba(59,130,246,0.22)",
    transition: "transform 0.2s ease, boxShadow 0.2s ease",
    letterSpacing: "-0.01em",
  },
  btnArrow: { fontSize: 18 },
  btnSecondary: {
    padding: "14px 24px", borderRadius: 16,
    background: "transparent", color: "#475569",
    fontSize: 15, fontWeight: 600,
    border: "1.5px solid #e2e8f0", cursor: "pointer",
    transition: "background 0.2s ease",
  },

  /* Floating Card */
  floatingCard: {
    flex: "0 0 320px", background: "white",
    borderRadius: 24, padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8) inset",
    border: "1px solid rgba(226,232,240,0.8)",
    backdropFilter: "blur(20px)",
  },
  floatCardHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16,
  },
  floatCardTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  floatCardTime: { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
  floatRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 0", borderBottom: "1px solid #f1f5f9",
  },
  floatRowLeft: { display: "flex", alignItems: "center", gap: 10 },
  floatDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  floatVehicle: { fontSize: 13, fontWeight: 600, color: "#0f172a" },
  floatDriver: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  floatBadge: {
    fontSize: 11, fontWeight: 700, padding: "3px 9px",
    borderRadius: 8, textTransform: "capitalize", letterSpacing: "0.02em",
  },

  /* Stats */
  statsSection: {
    maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px",
    position: "relative", zIndex: 1,
  },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16,
  },
  statCard: {
    background: "white", borderRadius: 20, padding: "24px 20px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    border: "1px solid rgba(226,232,240,0.7)",
    transition: "transform 0.25s ease, boxShadow 0.25s ease",
    cursor: "default",
  },
  statIcon: { fontSize: 28, marginBottom: 12 },
  statValue: { fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 8 },
  statTrend: {
    fontSize: 12, color: "#22c55e", fontWeight: 600,
    background: "#dcfce7", display: "inline-block",
    padding: "2px 8px", borderRadius: 8,
  },

  /* Features */
  featuresSection: {
    maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px",
    position: "relative", zIndex: 1, textAlign: "center",
  },
  sectionLabel: {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "#3b82f6", marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em",
    color: "#0f172a", marginBottom: 48, lineHeight: 1.15,
  },
  featuresGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20,
    textAlign: "left",
  },
  featureCard: {
    background: "white", borderRadius: 20, padding: 28,
    boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
    border: "1px solid rgba(226,232,240,0.7)",
    transition: "transform 0.25s ease, boxShadow 0.25s ease",
    cursor: "default",
  },
  featureIcon: { fontSize: 32, marginBottom: 16 },
  featureTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 10 },
  featureDesc: { fontSize: 14, lineHeight: 1.6, color: "#64748b" },

  /* Activity */
  activitySection: {
    maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px",
    position: "relative", zIndex: 1,
  },
  activityHeader: {
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    marginBottom: 24, flexWrap: "wrap", gap: 16,
  },
  sectionTitle2: {
    fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a", marginTop: 6,
  },
  liveChipLg: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 14px", borderRadius: 20,
    background: "#dcfce7", color: "#15803d",
    fontSize: 13, fontWeight: 700,
  },
  liveDotLg: {
    width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
    boxShadow: "0 0 0 3px rgba(34,197,94,0.25)", display: "inline-block",
  },
  activityList: {
    background: "white", borderRadius: 20,
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    border: "1px solid rgba(226,232,240,0.7)", overflow: "hidden",
  },
  activityRow: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s ease", cursor: "default",
  },
  activityAvatar: {
    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22,
  },
  activityInfo: { flex: 1 },
  activityVehicle: { fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2 },
  activityDriver: { fontSize: 12, color: "#94a3b8" },
  activityRight: { textAlign: "right" },
  activityStatus: {
    fontSize: 12, fontWeight: 700, padding: "4px 10px",
    borderRadius: 10, marginBottom: 4, display: "inline-block",
  },
  activityTime: { fontSize: 11, color: "#94a3b8" },

  /* CTA Strip */
  ctaStrip: {
    background: "linear-gradient(135deg, #1e40af 0%, #4f46e5 100%)",
    margin: "0 0 0 0", padding: "60px 24px",
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
  ctaStripSub: { fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 },
  btnPrimaryLg: {
    padding: "16px 32px", borderRadius: 16, flexShrink: 0,
    background: "white", color: "#1e40af",
    fontSize: 15, fontWeight: 800,
    border: "none", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    transition: "transform 0.2s ease",
    letterSpacing: "-0.01em",
  },

  /* Footer */
  footer: {
    background: "#f8fafc", borderTop: "1px solid #e2e8f0",
    padding: "32px 24px",
  },
  footerInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
  },
  footerLogo: { display: "flex", alignItems: "center", gap: 10 },
  footerBrand: { fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" },
  footerText: { fontSize: 13, color: "#2FA084" },
};