function getNextActions(trip) {
  const actions = [];

  const {
    tripState,
    phase,
    location,
    type,
    purpose,
    loadStatus,
    isIntraPlant,
    sourceFactoryId,
    destinationFactoryId
  } = trip;

  if (tripState === "CLOSED" || tripState === "CANCELLED") {
    return {
      actionRequiredBy: null,
      allowedActions: []
    };
  }

  // 1. Waiting at destination gate
  if (
    (location === "outside_factory" || location === "enroute") &&
    phase === "DESTINATION"
  ) {
    actions.push("CHECKIN", "CANCEL");

    return {
      actionRequiredBy: "atGate",
      allowedActions: actions
    };
  }

  // 2. Inside destination, delivery pending unload
  if (
    location === "inside_factory" &&
    phase === "DESTINATION" &&
    purpose === "Delivery" &&
    loadStatus !== "unloaded"
  ) {
    actions.push("UNLOAD");

    return {
      actionRequiredBy: "storeSite",
      allowedActions: actions
    };
  }

  // 3. Pickup pending load
  if (
    location === "inside_factory" &&
    purpose === "Pickup" &&
    loadStatus !== "loaded"
  ) {
    actions.push("LOAD");

    return {
      actionRequiredBy: isIntraPlant ? "storeSite" : "dispatchSite",
      allowedActions: actions
    };
  }

  // 4. Ready for checkout
  if (
    location === "inside_factory" &&
    loadStatus !== "pending" &&
    loadStatus !== "loaded"
  ) {
    actions.push("COMPLETE", "NEXT_TRIP");

    return {
      actionRequiredBy: "storeSite",
      allowedActions: actions
    };
  }

  return {
    actionRequiredBy: null,
    allowedActions: []
  };
}