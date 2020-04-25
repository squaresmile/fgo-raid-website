import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format } from "date-fns-tz";

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

function APGain(timestamp) {
  let APText = document.createElement("p");
  let APGain = (timestamp * 1000 - new Date()) / 1000 / 60 / 5;
  let boundedAPGain = Math.max(Math.floor(APGain), 0);
  APText.innerHTML = `${boundedAPGain} AP will regen until the next raids.`;
  return APText;
}

async function main() {
  const etaData = await fetch("data/eta.json").then((response) =>
    response.json()
  );
  const etaTextDiv = document.getElementById("etaText");
  if (etaData.eta.length === 0) {
    let noRaid = document.createElement("p");
    noRaid.innerHTML = `No ongoing raid at the moment.`;
    etaTextDiv.appendChild(noRaid);
    if (etaData.nextRaid.startTime === 0) {
      const raidSchedule = [1587859200, 1587945600, 1588118400];
      let upcomingRaids = raidSchedule.filter(
        (timestamp) => timestamp * 1000 > new Date()
      );
      let nextRaid = Math.min(...upcomingRaids);
      if (nextRaid !== 0) {
        let etaText = document.createElement("p");
        let [dateString, difference] = futureStrings(nextRaid, false);
        etaText.innerHTML = `Upcoming raids ${difference} (${dateString}).`;
        etaTextDiv.appendChild(etaText);
        etaTextDiv.appendChild(APGain(nextRaid));
      }
    } else {
      let etaText = document.createElement("p");
      let [dateString, difference] = futureStrings(
        etaData.nextRaid.startTime,
        false
      );
      let bosses = etaData.nextRaid.bosses;
      let bossesString =
        bosses.slice(0, -1).join(", ") + " and " + bosses.slice(-1);
      etaText.innerHTML = `Upcoming ${bossesString} raids ${difference} (${dateString}).`;
      etaTextDiv.appendChild(etaText);
      etaTextDiv.appendChild(APGain(etaData.nextRaid.startTime));
    }
  } else {
    for (const eta of etaData.eta) {
      let etaText = document.createElement("p");
      let [dateString, difference] = futureStrings(eta.ETA, true);
      etaText.innerHTML = `${eta["Boss"]}: ${difference} (${dateString})`;
      etaTextDiv.appendChild(etaText);
    }
  }
}
main();
