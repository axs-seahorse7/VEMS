function resolveSiteId(actorName, sites = []) {
  if (!actorName) return [];

  let siteNames = [];

  if (actorName.includes("atGate")) {
    siteNames = ["Security"];

  } else if (actorName.includes("storeSite") && actorName.includes("dispatchSite")) {
    siteNames = ["Store", "Dispatch"];

  } else if (actorName.includes("storeSite")) {
    siteNames = ["Store"];
    
  } else if (actorName.includes("dispatchSite")) {
    siteNames = ["Dispatch"];
  }

  return sites
    .filter(site => siteNames.includes(site.name))
    .map(site => site._id);
}

export default resolveSiteId;