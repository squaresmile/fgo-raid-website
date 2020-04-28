import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format } from "date-fns-tz";

function createPText(string) {
  let newPElement = document.createElement("p");
  newPElement.textContent = string;
  return newPElement;
}

function futureStrings(timestamp, strict) {
  let futureDate = new Date(timestamp * 1000);
  let futureString = format(futureDate, "M/d HH:mm zzz");
  let difference = "";
  if (strict) {
    difference = formatDistanceToNowStrict(futureDate, {
      addSuffix: true,
      roundingMethod: "floor",
    });
  } else {
    difference = formatDistanceToNow(futureDate, {
      addSuffix: true,
    });
  }
  return [futureString, difference];
}

function calcAPGain(timestamp) {
  let APGain = (timestamp * 1000 - new Date()) / 1000 / 60 / 5;
  let boundedAPGain = Math.max(Math.floor(APGain), 0);
  let APText = `${boundedAPGain} AP will regen until the next raids.`;
  return createPText(APText);
}

async function main() {
  const etaData = await fetch("data/eta.json").then((response) =>
    response.json()
  );
  const etaTextDiv = document.getElementById("etaText");
  if (etaData.eta.length === 0) {
    let noRaid = `No ongoing raid at the moment.`;
    etaTextDiv.appendChild(createPText(noRaid));
    if (etaData.nextRaid.startTime === 0) {
      const raidSchedule = [1587859200, 1587945600, 1588118400];
      let upcomingRaids = raidSchedule.filter(
        (timestamp) => timestamp * 1000 > new Date()
      );
      let nextRaid = Math.min(...upcomingRaids);
      if (nextRaid !== 0) {
        let [dateString, difference] = futureStrings(nextRaid, false);
        let etaText = `Upcoming raids ${difference} (${dateString}).`;
        etaTextDiv.appendChild(createPText(etaText));
        etaTextDiv.appendChild(calcAPGain(nextRaid));
      }
    } else {
      let [dateString, difference] = futureStrings(
        etaData.nextRaid.startTime,
        false
      );
      let bosses = etaData.nextRaid.bosses;
      let bossesString =
        bosses.slice(0, -1).join(", ") + " and " + bosses.slice(-1);
      let etaText = `Upcoming ${bossesString} raids ${difference} (${dateString}).`;
      etaTextDiv.appendChild(createPText(etaText));
      etaTextDiv.appendChild(calcAPGain(etaData.nextRaid.startTime));
    }
  } else {
    for (const eta of etaData.eta) {
      let [dateString, difference] = futureStrings(eta.ETA, true);
      let etaText = `${eta["Boss"]}: ${difference} (${dateString})`;
      etaTextDiv.appendChild(createPText(etaText));
    }
    let upcomingBosses = etaData.raidsInLine;
    if (upcomingBosses.length !== 0) {
      let bossesString = "";
      if (upcomingBosses.length > 1) {
        bossesString += upcomingBosses.slice(0, -1).join(", ") + " and ";
      }
      bossesString += upcomingBosses.slice(-1);
      let nextBosses = `${bossesString} in line to start.`;
      etaTextDiv.appendChild(createPText(nextBosses));
    }
  }
}
main();
