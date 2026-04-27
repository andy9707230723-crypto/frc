function normalizeTeamKey(team) {
  const raw = String(team || "").trim().toLowerCase();
  if (!raw) {
    return "";
  }

  return raw.startsWith("frc") ? raw : `frc${raw}`;
}

function sumAllianceOpr(alliance = [], oprMap = {}) {
  return alliance.reduce((sum, team) => {
    const teamKey = normalizeTeamKey(team);
    return sum + (Number(oprMap[teamKey]) || 0);
  }, 0);
}

export function calculateWinChance(redAlliance = [], blueAlliance = [], oprMap = {}) {
  const redTotal = sumAllianceOpr(redAlliance, oprMap);
  const blueTotal = sumAllianceOpr(blueAlliance, oprMap);
  const combined = redTotal + blueTotal;

  if (combined <= 0) {
    return {
      redTotal,
      blueTotal,
      redChance: 0.5,
      blueChance: 0.5,
    };
  }

  const redChance = redTotal / combined;
  const blueChance = blueTotal / combined;

  return {
    redTotal,
    blueTotal,
    redChance,
    blueChance,
  };
}
