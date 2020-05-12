import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format } from "date-fns-tz";
import * as Highcharts from "highcharts";

function createPText(string: string) {
  let newPElement = document.createElement("p");
  newPElement.textContent = string;
  return newPElement;
}

function diffArray(origArray: number[]) {
  let startArray = origArray.slice(0, -1);
  let endArray = origArray.slice(1);
  let result = [];
  for (var i = 0; i < startArray.length; i++) {
    result.push(endArray[i] - startArray[i]);
  }
  return result;
}

function rate(dataArray: number[], timeArray: number[]) {
  let dataDiff = diffArray(dataArray);
  let timeDiff = diffArray(timeArray);
  let result = [];
  for (var i = 0; i < dataDiff.length; i++) {
    result.push(Math.round(dataDiff[i] / timeDiff[i]));
  }
  return result;
}

function futureStrings(timestamp: number, strict: boolean) {
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

function calcAPGain(timestamp: number) {
  let APGain = (timestamp * 1000 - Date.now()) / 1000 / 60 / 5;
  let boundedAPGain = Math.max(Math.floor(APGain), 0);
  let APText = `${boundedAPGain} AP will regen until the next raids.`;
  return createPText(APText);
}

function bossesListString(bosses: string[], prefix = "") {
  let bossesString = prefix;
  if (bosses.length > 1) {
    bossesString += bosses.slice(0, -1).join(", ") + " and ";
  }
  bossesString += bosses.slice(-1);
  return bossesString;
}

interface EtaData {
  eta: { Boss: string; ETA: number }[];
  nextRaid: {
    bosses: string[];
    startTime: number;
  };
  raidsInLine: string[];
}

interface RaidData {
  phase: number;
  data: number[][];
}

async function main() {
  const etaData: EtaData = await fetch("data/eta.json").then((response) =>
    response.json()
  );
  const etaTextDiv = document.getElementById("etaText");
  if (etaData.eta.length === 0) {
    let noRaid = `No ongoing raid at the moment.`;
    etaTextDiv.appendChild(createPText(noRaid));
    if (etaData.nextRaid.startTime === 0) {
      const raidSchedule = [
        1587715200,
        1587772800,
        1587859200,
        1587945600,
        1588118400,
      ];
      let upcomingRaids = raidSchedule.filter(
        (timestamp) => timestamp * 1000 > Date.now()
      );
      if (upcomingRaids.length > 0) {
        let nextRaid = Math.min(...upcomingRaids);
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
      let bossesString = bossesListString(etaData.nextRaid.bosses);
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
      let bossesString = bossesListString(upcomingBosses);
      let nextBosses = `${bossesString} in line to start.`;
      etaTextDiv.appendChild(createPText(nextBosses));
    }
  }

  const raidData: RaidData[] = await fetch("data.json").then((response) =>
    response.json()
  );
  let phase4data = raidData[0];
  document.addEventListener("DOMContentLoaded", function () {
    var myChart = Highcharts.chart("container", {
      chart: {
        type: "bar",
      },
      title: {
        text: "Fruit Consumption",
      },
      xAxis: {
        categories: ["Apples", "Bananas", "Oranges"],
      },
      yAxis: {
        title: {
          text: "Fruit eaten",
        },
      },
      series: [
        {
          name: "Jane",
          data: [1, 0, 4],
        },
        {
          name: "John",
          data: [5, 7, 3],
        },
      ],
    });
  });
}
main();
