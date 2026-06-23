const formatDuration = (since) => {
  const ms = Date.now() - new Date(since).getTime();
  const totalHrs = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHrs / 24);
  const hrs = totalHrs % 24;
  if (days > 0) return `${days}d ${hrs}h`;
  return `${hrs}h`;
};

const getSourceFactoryName = (trip) => {
  if (trip.sourceFactoryId) {
    return trip.sourceFactoryId?.name ;
  } else if (trip.externalSource) {
    return trip.externalSource;
  } 
 
  return "Unknown Factory";
}

const getDestinationFactoryName = (trip) => {
  if (trip.destinationFactoryId) {
    return trip.destinationFactoryId?.name ;
  } else if (trip.externalDestination) {
    return trip.externalDestination;
  }
  return "Unknown Factory";
}

export const delayedTripsTemplate = (payload) => {
  const { level, factoryName, trips } = payload;

  const rows = trips.map(trip => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${trip.vehicleId?.vehicleNumber || "N/A"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${trip.driverId?.driverName || "N/A"} <span style="color:#c0392b;font-weight:600;">(${trip.driverId?.driverContact || "N/A"})</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${getSourceFactoryName(trip)} &rarr; ${getDestinationFactoryName(trip)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;">${trip.location === "outside_factory" ? "Outside Factory" : trip.location === "inside_factory" ? "Inside Factory" : trip.location || "N/A"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#c0392b;font-weight:600;">${formatDuration(trip.waitingSince)}</td>
    </tr>
  `).join("");

  return {
    subject: `[${level}] VEMS Delay Alert - ${factoryName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
        <div style="background:#1a1a2e;padding:16px 20px;border-radius:8px 8px 0 0;">
          <span style="color:#fff;font-size:13px;letter-spacing:0.5px;">PG GROUP</span>
          <h2 style="color:#fff;margin:4px 0 0;font-size:18px;">VEMS Delay Alert &mdash; ${factoryName}</h2>
        </div>
        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;background:#fff;">
          <tr style="background:#f5f5f7;">
            <th style="padding:10px 12px;text-align:left;font-size:13px;">Vehicle</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;">Driver</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;">Route</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;">Current Location</th>
            <th style="padding:10px 12px;text-align:left;font-size:13px;">Delayed By</th>
          </tr>
          ${rows}
        </table>
      </div>
    `
  };
};