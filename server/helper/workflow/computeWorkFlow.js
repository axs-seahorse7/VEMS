import  getStage from "./getStage.js";
import getAllowedActions from "./getAllowedAction.js";
import getActionRequiredBy from "./getActionRequiredBy.js";
import getActor from "./getActor.js";
import getTripPhase from "./getTripPhase.js";

function computeWorkflow(trip, sites, user, tripPhase) {
  const stage = getStage(trip, user);
  const actionRequiredBy = getActionRequiredBy(stage, trip, sites);
  const allowedActions = getAllowedActions(stage, trip);

  return {
    stage,
    allowedActions,
    actionRequiredBy,
    
  };
}

export default computeWorkflow;