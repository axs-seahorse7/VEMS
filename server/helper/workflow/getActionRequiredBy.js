import getActor from "./getActor.js";
import resolveSiteId from "./resolveSiteId.js";

function getActionRequiredBy(stage, trip, sites = []) {
  const actor = getActor(stage);

  const siteId = resolveSiteId(actor, sites);

  return {
    actor,   // fallback for old trips
    siteId   // primary for new trips
  };
}

export default getActionRequiredBy;