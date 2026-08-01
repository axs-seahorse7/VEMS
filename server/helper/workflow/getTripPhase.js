

const getTripPhase = (trip, user) => {
    const {currentFactoryId, externalDestination} = trip;
    const {factory} = user;

    if (currentFactoryId) {
        return currentFactoryId.toString() === factory._id.toString() ? "DESTINATION" : "ORIGIN";
    }

  return "OTHER_PHASE";
}


export default getTripPhase;