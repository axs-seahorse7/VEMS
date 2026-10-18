import  { STAGES } from"./constant.js";


function getActor(stage) {
  switch (stage) {
    case STAGES.WAITING_CHECKIN:
      return ["atGate", "storeSite", "dispatchSite"];

    case STAGES.IN_TRANSIT:
      return ["atGate"];

    case STAGES.ARRIVED:
      return ["atGate", "storeSite", "dispatchSite"];

    case STAGES.WAITING_UNLOAD:
      return ["storeSite", "dispatchSite"];

    case STAGES.WAITING_LOAD:
      return ["dispatchSite", "storeSite"];
    
    case STAGES.VEHICLE_UNLOADED:
      return ["storeSite", "dispatchSite"];

    case STAGES.READY_FOR_SITE_CONFIRMATION:
      return ["storeSite", "dispatchSite"];

    case STAGES.SELECT_NEXT_LOCATION:
      return ["storeSite", "dispatchSite"];

    case STAGES.READY_FOR_DISPATCH_CHECKOUT:
      return ["atGate"];

    case STAGES.READY_FOR_EXIT_CHECKOUT:
      return ["atGate"];


      // INTRA FACTORY MOVEMENT STAGES
    case STAGES.READY_FOR_ARRIVAL:
      return [  "dispatchSite", "storeSite"];

    case STAGES.READY_FOR_LOAD:
      return [  "dispatchSite", "storeSite"];

    case STAGES.READY_FOR_UNLOAD:
      return [  "dispatchSite", "storeSite"];

    case STAGES.READY_FOR_ROUTE_CHANGE:
      return [  "dispatchSite", "storeSite"];

    case STAGES.READY_FOR_DISPATCH:
      return [  "dispatchSite", "storeSite"];

    case STAGES.READY_FOR_CLOSE:
      return [  "dispatchSite", "storeSite"];



    default:
      return null;
  }
}

export default getActor;