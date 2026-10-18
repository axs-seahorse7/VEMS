const ACTOR_KEYWORD = {
  atGate: "security",
  storeSite: "store",
  dispatchSite: "dispatch",
};

function resolveSiteId(actors, sites = []) {
  if (!actors?.length) return [];

  const keywords = actors.map((a) => ACTOR_KEYWORD[a]).filter(Boolean);

  return sites
    .filter((site) => {
      const name = site.name?.trim().toLowerCase() || "";
      return keywords.some((k) => name.includes(k));
    })
    .map((site) => site._id);
}

export default resolveSiteId;