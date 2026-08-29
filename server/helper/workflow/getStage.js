import  { STAGES } from "./constant.js";

function getStage(trip, user) {
  const {
    tripState,
    location,
    phase,
    purpose,
    loadStatus,
    status,
    type,
    currentFactoryId,
    destinationFactoryId,
    sourceFactoryId,
    isIntraPlant,
    siteId,
    blockId,
    sourceSiteId,
    sourceBlockId,
    destinationSiteId,
    destinationBlockId
  } = trip;

  const userFactoryId = user?.factory?._id?.toString();
  const {siteId: userSiteId, blockId: userBlockId} = user || {};
  
  const tripSourceSiteId = isIntraPlant && typeof sourceSiteId === "object"? String(sourceSiteId._id) : sourceSiteId;
  const tripSourceBlockId = isIntraPlant && typeof sourceBlockId === "object"? String(sourceBlockId._id) : sourceBlockId;
  const tripDestinationSiteId = isIntraPlant && typeof destinationSiteId === "object"? String(destinationSiteId._id) : destinationSiteId;
  const tripDestinationBlockId = isIntraPlant && typeof destinationBlockId === "object"?  String(destinationBlockId._id) : destinationBlockId;

  // ---------------------------- INTRA FACTORY MOVEMENT STAGES ----------------------------

  const isAtSourceSite =
    isIntraPlant && String(userSiteId) === String(tripSourceSiteId) 

  const isAtSourceBlock =
    isIntraPlant && String(userBlockId) === String(tripSourceBlockId) 

  const isAtDestinationSite =
    isIntraPlant && String(userSiteId) === String(tripDestinationSiteId) 

  const isAtDestinationBlock =
    isIntraPlant && String(userBlockId) === String(tripDestinationBlockId) 

  const isTripInTransit = status === "IN_TRANSIT";

  if (
    isIntraPlant &&
    String(userBlockId) === tripSourceBlockId &&
    tripState === "ACTIVE" &&
    location === "inside_factory" &&
    isAtSourceSite &&
    isAtSourceBlock &&
    phase === "ORIGIN" &&
    loadStatus === "pending"
  ) {
    return STAGES.READY_FOR_DISPATCH;
  }


  if (
    isIntraPlant &&
    String(userBlockId) === tripDestinationBlockId &&
    tripState === "ACTIVE" &&
    location === "enroute" &&
    isAtDestinationSite &&
    isAtDestinationBlock &&
    phase === "ORIGIN" &&
    isTripInTransit
  ) {
    return STAGES.READY_FOR_ARRIVAL;
  }

  if ( 
    isIntraPlant && 
    tripState === "ACTIVE" && 
    location === "inside_factory" && 
    isAtDestinationSite && 
    isAtDestinationBlock && 
    phase === "DESTINATION" && 
    status === "ARRIVED" && 
    purpose === "Pickup" && 
    loadStatus === "pending" ) {
    return STAGES.READY_FOR_LOAD;
  }

  if ( 
    isIntraPlant && 
    tripState === "ACTIVE" && 
    location === "inside_factory" && 
    isAtDestinationSite && 
    isAtDestinationBlock && 
    phase === "DESTINATION" && 
    status === "ARRIVED" && 
    purpose === "Delivery" && 
    loadStatus === "pending" ) {
    return STAGES.READY_FOR_UNLOAD;
  }

  if ( 
    isIntraPlant && 
    tripState === "ACTIVE" && 
    location === "inside_factory" && 
    isAtDestinationSite && 
    isAtDestinationBlock && 
    phase === "DESTINATION" && 
    status === "ARRIVED" && 
    purpose === "Delivery" && 
    loadStatus === "unloaded" ) {
    return STAGES.READY_FOR_CLOSE;
  }

  if ( 
    isIntraPlant && 
    tripState === "ACTIVE" && 
    location === "inside_factory" && 
    isAtDestinationSite && 
    isAtDestinationBlock && 
    phase === "DESTINATION" && 
    status === "ARRIVED" && 
    loadStatus !== "pending" ) {
    return STAGES.READY_FOR_ROUTE_CHANGE;
  }






  // ---------------- INTERNAL & EXTERNAL FACTORY MOVEMENT STAGES --------------------------------

  if (tripState === "CLOSED") return STAGES.CLOSED;
  if (tripState === "CANCELLED") return STAGES.CANCELLED;

  // Outside factory waiting for gate
  if (
    !isIntraPlant &&
    location === "outside_factory"&&
    phase === "DESTINATION" && phase === "DESTINATION" && tripState === "ACTIVE" && userFactoryId === String((typeof destinationFactoryId) === "object" ? destinationFactoryId?._id : destinationFactoryId)
  ) {
    return STAGES.ARRIVED;
  }

  if (
    !isIntraPlant &&
     location === "enroute" &&
    phase === "ORIGIN" &&
    tripState === "ACTIVE" &&
    userFactoryId === String((typeof destinationFactoryId) === "object"? destinationFactoryId?._id : destinationFactoryId) &&
    status === "IN_TRANSIT"
  ) {
    return STAGES.IN_TRANSIT;
  }

  // Delivery trip waiting unload
  if (
    !isIntraPlant &&
    location === "inside_factory" &&
    phase === "DESTINATION" &&
    purpose === "Delivery" &&
    loadStatus !== "unloaded"
  ) {
    return STAGES.WAITING_UNLOAD;
  }

  // Pickup trip waiting load
  if (
    !isIntraPlant &&
    location === "inside_factory" &&
    purpose === "Pickup" &&
    loadStatus !== "loaded" &&
    phase === "DESTINATION"
  ) {
    return STAGES.WAITING_LOAD;
  }

  // Loaded/unloaded and ready for store completion
  if ( !isIntraPlant && location === "inside_factory" && purpose === "Pickup" && loadStatus === "loaded" ) {
    return STAGES.SELECT_NEXT_LOCATION;
  }

  // if (!isIntraPlant && tripState === "ACTIVE" && type === "internal_transfer" && location === "inside_factory" && (userFactoryId === String(typeof currentFactoryId === "object" ? currentFactoryId?._id : currentFactoryId)) ) {
  //   return STAGES.READY_FOR_DISPATCH_CHECKOUT;
  // }

  if (!isIntraPlant && tripState === "ACTIVE" && loadStatus === "pending" && type === "internal_transfer" && location === "inside_factory" && (userFactoryId === String(typeof currentFactoryId === "object" ? currentFactoryId?._id : currentFactoryId)) ) {
    return STAGES.READY_FOR_DISPATCH_CHECKOUT;
  }

  if (!isIntraPlant && (tripState === "COMPLETED" || tripState === "ACTIVE") && type === "external_delivery" && location === "inside_factory" && (userFactoryId === String((typeof currentFactoryId) === "object" ? currentFactoryId?._id : currentFactoryId)) ) {
    return STAGES.READY_FOR_EXIT_CHECKOUT;
  }

  if (!isIntraPlant && tripState === "ACTIVE" && location === "inside_factory" && (userFactoryId === String( (typeof destinationFactoryId) === "object" ? destinationFactoryId?._id : destinationFactoryId)) &&
      loadStatus === "unloaded"
  ) {
    return STAGES.VEHICLE_UNLOADED;
  }

  if (!isIntraPlant && tripState === "COMPLETED" && location === "inside_factory" && (userFactoryId === String( (typeof destinationFactoryId) === "object" ? destinationFactoryId?._id : destinationFactoryId)) &&
      loadStatus === "unloaded"
  ) {
    return STAGES.READY_FOR_EXIT_CHECKOUT;
  }

  

  return null;
}

export default getStage;