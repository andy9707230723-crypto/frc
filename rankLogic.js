const TIER_DEFINITIONS = [
  { key: "grandpa", minPercentile: 95, colorClass: "bg-amber-400/20 text-amber-300 border border-amber-300/30" },
  { key: "dad", minPercentile: 80, colorClass: "bg-violet-400/20 text-violet-300 border border-violet-300/30" },
  { key: "peers", minPercentile: 40, colorClass: "bg-emerald-400/20 text-emerald-300 border border-emerald-300/30" },
  { key: "son", minPercentile: 15, colorClass: "bg-blue-400/20 text-blue-300 border border-blue-300/30" },
  { key: "grandson", minPercentile: 0, colorClass: "bg-slate-400/20 text-slate-300 border border-slate-300/30" },
];

export function buildRankedTeams(oprMap = {}, rankingEntries = []) {
  const rankingMap = new Map(
    rankingEntries.map((entry) => [String(entry.team_key).replace("frc", ""), entry]),
  );

  const teams = Object.entries(oprMap)
    .map(([teamKey, opr]) => {
      const teamNumber = String(teamKey).replace("frc", "");
      return {
        teamKey,
        teamNumber,
        opr: Number(opr) || 0,
        ranking: rankingMap.get(teamNumber) || null,
      };
    })
    .sort((a, b) => b.opr - a.opr);

  const total = teams.length;

  return teams.map((team, index) => {
    const percentile = total <= 1 ? 100 : ((total - index - 1) / (total - 1)) * 100;
    const tier = getTierByPercentile(percentile);

    return {
      ...team,
      rank: index + 1,
      percentile,
      tier,
    };
  });
}

export function getTierByPercentile(percentile) {
  return TIER_DEFINITIONS.find((tier) => percentile >= tier.minPercentile) || TIER_DEFINITIONS.at(-1);
}

export function getTierDefinitions() {
  return TIER_DEFINITIONS;
}
