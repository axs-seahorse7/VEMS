import getActor from "./getActor.js";
import resolveSiteId from "./resolveSiteId.js";
import { STAGES } from "./constant.js";

// Stages where some actors are optional: only these are shown as "required"
const PRIMARY_ACTOR_OVERRIDE = {
  [STAGES.ARRIVED]: ["atGate"],   // store / dispatch can check in, but security is the owner
};

function getActionRequiredBy(stage, trip, sites = []) {
  const actor = getActor(stage);                          // who is allowed to act
  const primaryActor = PRIMARY_ACTOR_OVERRIDE[stage] ?? actor;  // who the card should name

  return {
    actor,
    siteId: resolveSiteId(actor, sites),                  // permission check (unchanged)
    primaryActor,
    primarySiteId: resolveSiteId(primaryActor, sites),    // for the label
  };
}

export default getActionRequiredBy;