function AreaSparkline({ data, height = 70, color = C.teal }) {
  const containerRef = useRef(null);
  const [width,   setWidth]   = useState(0);
  const [tooltip, setTooltip] = useState(null); // { x, y, day }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(containerRef.current);
    setWidth(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const pts = (() => {
    if (!data || data.length === 0 || width === 0) return [];
    const vals = data?.map(d => d.count);
    const max  = Math.max(...vals, 1);
    return data?.map((d, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = height - (d.count / max) * (height - 10) - 5;
      return { x, y, ...d };
    });
  })();

  const linePath = pts?.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = pts?.length ? `${linePath} L${width},${height} L0,${height} Z` : "";
  const gradId   = `sparkGrad-${color.replace("#", "")}`;

  // Find nearest point by mouse X
  const handleMouseMove = (e) => {
    if (!pts.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    let   best = 0;
    let   bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const p = pts[best];
    setTooltip({ svgX: p.x, svgY: p.y, day: p });
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, display: "block", position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      {width > 0 && (
        <>
          <svg
            width={width}
            height={height}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
            {linePath && (
              <path d={linePath} fill="none" stroke={color}
                strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* regular dots */}
            {pts?.map((p, i) =>
              p.count > 0 ? (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
              ) : null
            )}

            {/* hover crosshair */}
            {tooltip && (
              <>
                <line
                  x1={tooltip.svgX} y1={0}
                  x2={tooltip.svgX} y2={height}
                  stroke={color} strokeWidth={1}
                  strokeDasharray="3 3" opacity={0.5}
                />
                <circle
                  cx={tooltip.svgX} cy={tooltip.svgY}
                  r={5} fill={color}
                  stroke="#fff" strokeWidth={2}
                />
              </>
            )}
          </svg>

          {/* ── Tooltip bubble ── */}
          {tooltip && (
            <TooltipBubble
              day={tooltip.day}
              svgX={tooltip.svgX}
              svgY={tooltip.svgY}
              containerWidth={width}
              color={color}
            />
          )}
        </>
      )}
    </div>
  );
}

export default AreaSparkline;