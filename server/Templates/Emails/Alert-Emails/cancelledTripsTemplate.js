export const cancelledTripsTemplate = (payload) => {
  const {
    trip,
    reason,
    cancelledBy,
    driverName,
    driverContact,
    vehicleNumber,
    vehicleType,
    cancelledAt,
    startedAt,
    sourceFactory,
    destinationFactory,
    sourceFactoryLocation,
    destinationFactoryLocation,
  } = payload;

  const duration = (() => {
    try {
      const diff = Math.floor((new Date(cancelledAt) - new Date(startedAt)) / (1000 * 60));
      return isNaN(diff) || diff < 0 ? "N/A" : `${diff} min${diff !== 1 ? "s" : ""}`;
    } catch { return "N/A"; }
  })();

  const fmt = (val) => val || "N/A";

  return {
    subject: `Trip Cancelled — Vehicle ${fmt(vehicleNumber)}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Trip Cancellation Notice</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    background: #f0f2f5;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #1a1a2e;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px 16px;
  }

  /* TOP BAR */
  .top-bar {
    background: #ffffff;
    border-radius: 12px 12px 0 0;
    border: 1px solid #e5e7eb;
    border-bottom: none;
    padding: 16px 24px;
  }

  .top-bar-inner {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .top-left {
    display: table-cell;
    vertical-align: middle;
  }

  .top-right {
    display: table-cell;
    vertical-align: middle;
    text-align: right;
    width: 130px;
  }

  .logo { height: 32px; object-fit: contain; }

  .sys-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 20px;
    padding: 4px 12px;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  /* ALERT BANNER */
  .alert-banner {
    background: linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%);
    padding: 16px 24px;
  }

  .alert-banner-inner {
    display: table;
    width: 100%;
  }

  .alert-icon-cell {
    display: table-cell;
    vertical-align: middle;
    width: 48px;
  }

  .alert-icon {
    width: 38px; height: 38px;
    background: rgba(255,255,255,0.12);
    border-radius: 9px;
    text-align: center;
    line-height: 38px;
    font-size: 18px;
  }

  .alert-text-cell {
    display: table-cell;
    vertical-align: middle;
    padding-left: 12px;
  }

  .alert-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    line-height: 1.3;
  }

  .alert-sub {
    font-size: 11px;
    color: rgba(255,255,255,0.6);
    margin-top: 2px;
  }

  /* CARD */
  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-top: none;
    padding: 20px 24px;
    border-radius: 0 0 12px 12px;
  }

  /* SECTION TITLE */
  .sec {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.9px;
    text-transform: uppercase;
    color: #9ca3af;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f3f4f6;
  }

  /* GREETING */
  .greeting {
    font-size: 13.5px;
    color: #374151;
    line-height: 1.7;
    margin-bottom: 20px;
  }

  /* STATUS STRIP — table-based so pill always stays right */
  .status-strip {
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }

  .status-strip-inner {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .status-left {
    display: table-cell;
    vertical-align: middle;
  }

  .status-right {
    display: table-cell;
    vertical-align: middle;
    text-align: right;
    width: 110px;
  }

  .veh-label {
    font-size: 10px;
    color: #9ca3af;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 3px;
  }

  .veh-num {
    font-size: 16px;
    font-weight: 700;
    color: #111827;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
  }

  .cancelled-pill {
    display: inline-block;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 11.5px;
    font-weight: 700;
    color: #dc2626;
    white-space: nowrap;
  }

  /* ROUTE — table-based for bulletproof 3-col layout */
  .route-wrap {
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
  }

  .route-table {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .rnode {
    display: table-cell;
    vertical-align: middle;
    width: 42%;
  }

  .rnode.right {
    text-align: right;
  }

  .rmid {
    display: table-cell;
    vertical-align: middle;
    text-align: center;
    width: 16%;
    padding: 0 4px;
  }

  .rnode-tag {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9ca3af;
    margin-bottom: 3px;
  }

  .rnode-name {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    word-break: break-word;
  }

  .rnode-addr {
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
    line-height: 1.4;
  }

  .rmid-truck { font-size: 20px; display: block; margin-bottom: 4px; }

  .rdot-amber {
    display: inline-block;
    width: 5px; height: 5px; border-radius: 50%;
    background: #f59e0b;
    vertical-align: middle;
  }

  .rdash {
    display: inline-block;
    width: 16px; height: 1.5px;
    background: linear-gradient(90deg, #f59e0b, #ef4444);
    vertical-align: middle;
    margin: 0 2px;
  }

  .rdot-red {
    display: inline-block;
    width: 5px; height: 5px; border-radius: 50%;
    background: #ef4444;
    vertical-align: middle;
  }

  .rmid-veh {
    display: block;
    font-size: 8.5px;
    font-weight: 700;
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 4px;
    padding: 1px 4px;
    font-family: monospace;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* INFO TABLE */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .info-table tr { border-bottom: 1px solid #f3f4f6; }
  .info-table tr:last-child { border-bottom: none; }

  .info-table td {
    padding: 11px 16px;
    font-size: 13px;
    vertical-align: middle;
  }

  .td-key {
    color: #6b7280;
    font-weight: 500;
    width: 44%;
    white-space: nowrap;
  }

  .td-val {
    color: #111827;
    font-weight: 600;
    text-align: right;
  }

  .td-val.red { color: #dc2626; }
  .td-val.mono { font-family: 'Courier New', monospace; letter-spacing: 0.5px; }

  .dot-green {
    display: inline-block;
    width: 7px; height: 7px;
    background: #22c55e;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }

  .dot-red {
    display: inline-block;
    width: 7px; height: 7px;
    background: #ef4444;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }

  /* REASON */
  .reason-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-left: 3px solid #ef4444;
    border-radius: 0 10px 10px 0;
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .reason-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #dc2626;
    margin-bottom: 8px;
  }

  .reason-text {
    font-size: 13px;
    color: #7f1d1d;
    line-height: 1.7;
    font-style: italic;
  }

  .reason-by {
    margin-top: 10px;
    font-size: 11.5px;
    color: #991b1b;
  }

  /* CLOSING */
  .closing {
    font-size: 13px;
    color: #4b5563;
    line-height: 1.7;
    margin-bottom: 16px;
  }

  .sign {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
  }

  hr.divider {
    border: none;
    border-top: 1px solid #f3f4f6;
    margin: 18px 0;
  }

  /* FOOTER */
  .footer {
    text-align: center;
    padding: 14px 24px 6px;
    font-size: 11px;
    color: #9ca3af;
    line-height: 1.7;
  }

  /* MOBILE */
  @media (max-width: 480px) {
    .wrap { padding: 12px 8px; }
    .top-bar { padding: 12px 16px; }
    .logo { height: 26px; }
    .alert-banner { padding: 14px 16px; }
    .alert-title { font-size: 14px; }
    .card { padding: 16px; }
    .veh-num { font-size: 13px; }
    .info-table td { padding: 9px 12px; font-size: 12px; }
    .td-key { width: 48%; white-space: normal; }
    .rnode-name { font-size: 12px; }
    .rnode-addr { font-size: 10.5px; }
  }
</style>
</head>
<body>

<div class="wrap">

  <!-- TOP BAR -->
  <div class="top-bar">
    <div class="top-bar-inner">
      <div class="top-left">
        <img src="https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png" alt="PG Logo" class="logo"/>
      </div>
      <div class="top-right">
        <span class="sys-badge">&#9888; VEMS Alert</span>
      </div>
    </div>
  </div>

  <!-- ALERT BANNER -->
  <div class="alert-banner">
    <div class="alert-banner-inner">
      <div class="alert-text-cell">
        <div class="alert-title">Trip Cancellation Notice</div>
        <div class="alert-sub">Auto-generated by PG VEMS &nbsp;&middot;&nbsp; Do not reply</div>
      </div>
    </div>
  </div>

  <!-- MAIN CARD -->
  <div class="card">

    <!-- Greeting -->
    <p class="greeting">
      Dear <strong>Manager</strong>,<br/>
      This is an automated alert from the PG VEMS. A scheduled trip has been <strong style="color:#dc2626;">cancelled</strong>. Please review the details below and take immediate action.
    </p>

    <!-- Status Strip -->
    <div class="status-strip">
      <div class="status-strip-inner">
        <div class="status-left">
          <div class="veh-label">Vehicle Number</div>
          <div class="veh-num">${fmt(vehicleNumber)}</div>
        </div>
        <div class="status-right">
          <span class="cancelled-pill">&#128683; Cancelled</span>
        </div>
      </div>
    </div>

    <!-- Route -->
    <div class="sec">Route</div>
    <div class="route-wrap">
      <div class="route-table">
        <div class="rnode">
          <div class="rnode-tag">Origin</div>
          <div class="rnode-name">${fmt(sourceFactory)}</div>
          <div class="rnode-addr">${fmt(sourceFactoryLocation)}</div>
        </div>
        <div class="rmid">
          <span class="rmid-truck"></span>
          <div>
            <span class="rdot-amber"></span>
            <span class="rdash"></span>
            <span class="rdot-red"></span>
          </div>
          <span class="rmid-veh">${fmt(vehicleNumber)}</span>
        </div>
        <div class="rnode right">
          <div class="rnode-tag">Destination</div>
          <div class="rnode-name">${fmt(destinationFactory)}</div>
          <div class="rnode-addr">${fmt(destinationFactoryLocation)}</div>
        </div>
      </div>
    </div>

    <!-- Trip Timeline -->
    <div class="sec">Trip Timeline</div>
    <table class="info-table">
      <tr>
        <td class="td-key"><span class="dot-green"></span>Started At</td>
        <td class="td-val">${fmt(startedAt)}</td>
      </tr>
      <tr>
        <td class="td-key"><span class="dot-red"></span>Cancelled At</td>
        <td class="td-val red">${fmt(cancelledAt)}</td>
      </tr>
      <tr>
        <td class="td-key">&#9201; Duration</td>
        <td class="td-val">${duration}</td>
      </tr>
      <tr>
        <td class="td-key">Factory</td>
        <td class="td-val">${destinationFactory}</td>
      </tr>
      <tr>
        <td class="td-key">Factory Location</td>
        <td class="td-val">${destinationFactoryLocation}</td>
      </tr>
    </table>

    <!-- Vehicle Info -->
    <div class="sec">Vehicle Info</div>
    <table class="info-table">
      <tr>
        <td class="td-key">Vehicle No.</td>
        <td class="td-val mono">${fmt(vehicleNumber)}</td>
      </tr>
      <tr>
        <td class="td-key">Vehicle Type</td>
        <td class="td-val">${fmt(vehicleType)}</td>
      </tr>
      <tr>
        <td class="td-key">Driver</td>
        <td class="td-val">${fmt(driverName)}</td>
      </tr>
      <tr>
        <td class="td-key">Driver Contact</td>
        <td class="td-val">${fmt(driverContact)}</td>
      </tr>
      <tr>
        <td class="td-key">Cancelled By</td>
        <td class="td-val">${fmt(cancelledBy)}</td>
      </tr>
      
    </table>

    <!-- Cancellation Reason -->
    <div class="sec">Cancellation Reason</div>
    <div class="reason-box">
      <div class="reason-label">&#128203; Reported Reason</div>
      <div class="reason-text">"${fmt(reason)}"</div>
      <div class="reason-by">&#8212; <strong>${fmt(cancelledBy)}</strong> &nbsp;&middot;&nbsp; ${fmt(cancelledAt)}</div>
    </div>

    <hr class="divider"/>

    <!-- Closing -->
    <p class="closing">
      For queries, contact the VEMS Operations team directly.<br/><br/>
      Regards,<br/>
      <span class="sign">IT &amp; Innovation Team &mdash; PG Group</span>
    </p>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    This email was auto-generated by PG VEMS.<br/>
    Please do not reply &nbsp;&middot;&nbsp; &copy; 2025 PG Group. All rights reserved.
  </div>

</div>
</body>
</html>`,
  };
};