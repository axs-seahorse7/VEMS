function VBarGroup({ bars }) {
  const max = Math.max(...bars?.map(b => b.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90, marginTop: 8 }}>
      {bars?.map((b, i) => {
        const pct = (b.value / max) * 100;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{b.value}%</div>
            <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: 64 }}>
              <div style={{
                width: "100%",
                height: `${pct}%`,
                minHeight: 4,
                background: b.color,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.9s ease",
              }} />
            </div>
            <div style={{ fontSize: 9.5, color: C.muted, textAlign: "center", lineHeight: 1.3 }}>{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default VBarGroup;