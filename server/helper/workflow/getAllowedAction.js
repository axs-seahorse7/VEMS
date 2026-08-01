import { STAGES, ACTIONS } from "./constant.js";

function getAllowedActions(stage, trip) {
  switch (stage) {

    // ---------------------------- INTERNAL & EXTERNAL FACTORY MOVEMENT ACTIONS ----------------------------
    case STAGES.WAITING_CHECKIN:
      return [ACTIONS.CHECKIN, ACTIONS.CANCEL];

    case STAGES.IN_TRANSIT:
      return [ACTIONS.ARRIVED];

    case STAGES.ARRIVED:
      return [ACTIONS.CHECKIN, ACTIONS.CANCEL];

    case STAGES.WAITING_UNLOAD:
      return [ACTIONS.UNLOAD, ACTIONS.ROUTE_CHANGE_WITHOUT_UNLOAD];

    case STAGES.WAITING_LOAD:
      return [ACTIONS.LOAD, ACTIONS.ROUTE_CHANGE_WITHOUT_LOAD];

    case STAGES.VEHICLE_UNLOADED:
      return [ACTIONS.LOAD_AND_ROUTE_CHANGE, ACTIONS.COMPLETE,];

    case STAGES.SELECT_NEXT_LOCATION:
      return [ACTIONS.NEXT_LOCATION];

    case STAGES.READY_FOR_SITE_CONFIRMATION:
      return [ACTIONS.COMPLETE, ACTIONS.NEXT_TRIP];

    case STAGES.READY_FOR_EXIT_CHECKOUT:
      return [ACTIONS.EXIT_CHECKOUT];

    case STAGES.READY_FOR_DISPATCH_CHECKOUT:
      return [ACTIONS.DISPATCH_CHECKOUT];


      // --------------------------- INTRA FACTORY MOVEMENT ACTIONS ---------------------------
    case STAGES.READY_FOR_ARRIVAL:
      return [ACTIONS.ARRIVAL];
      
    case STAGES.READY_FOR_LOAD:
      return [ACTIONS.LOAD];
      
    case STAGES.READY_FOR_UNLOAD:
      return [ACTIONS.UNLOAD];
      
    case STAGES.READY_FOR_ROUTE_CHANGE:
      return [ACTIONS.ROUTE_CHANGE];

    case STAGES.READY_FOR_DISPATCH:
      return [ACTIONS.DISPATCH];

    case STAGES.READY_FOR_CLOSE:
      return [ACTIONS.CLOSE, ACTIONS.LOAD_NEW_MATERIAL];

    default:
      return [];
  }
}


export default getAllowedActions;