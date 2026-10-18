import  getStage from "./getStage.js";
import getAllowedActions from "./getAllowedAction.js";
import getActionRequiredBy from "./getActionRequiredBy.js";
import getActor from "./getActor.js";
import getTripPhase from "./getTripPhase.js";

const ACTORS_LIST = ["atGate", "storeSite", "dispatchSite"];
const SITE_NAME_TO_ACTOR = { Security: "atGate", Store: "storeSite", Dispatch: "dispatchSite" };

function getUserActor(user, sites = []) {
  // same value the frontend matches against actionRequiredBy.actor
  if (ACTORS_LIST.includes(user?.workLocation)) return user.workLocation;

  // fallback: derive from the user's site name
  const userSiteId = String(user?.siteId?._id ?? user?.siteId ?? "");
  const site = sites.find((s) => String(s._id) === userSiteId);
  return SITE_NAME_TO_ACTOR[site?.name] ?? null;
}

function computeWorkflow(trip, sites, user, tripPhase) {
  const stage = getStage(trip, user);
  const actionRequiredBy = getActionRequiredBy(stage, trip, sites);
  const userActor = getUserActor(user, sites);
  const allowedActions = getAllowedActions(stage, trip, userActor);

  return { stage, allowedActions, actionRequiredBy };
}

export default computeWorkflow;