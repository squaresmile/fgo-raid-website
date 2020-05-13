import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format } from "date-fns-tz";
import * as Highcharts from "highcharts";
import Accessibility from "highcharts/modules/accessibility";
import Exporting from "highcharts/modules/exporting";
import ExportData from "highcharts/modules/export-data";
// import Boost from "highcharts/modules/boost";

function createPText(string) {
  let newPElement = document.createElement("p");
  newPElement.textContent = string;
  return newPElement;
}

function highChartsArray(dataArray, timeArray) {
  let outArray = [];
  for (let i = 0; i < dataArray.length; i++) {
    outArray.push([timeArray[i] * 1000, dataArray[i]]);
  }
  return outArray;
}

function diffArray(origArray) {
  let startArray = origArray.slice(0, -1);
  let endArray = origArray.slice(1);
  let result = [];
  for (let i = 0; i < startArray.length; i++) {
    result.push(endArray[i] - startArray[i]);
  }
  return result;
}

function rate(dataArray, timeArray) {
  let dataDiff = diffArray(dataArray);
  let timeDiff = diffArray(timeArray);
  let result = [];
  for (let i = 0; i < dataDiff.length; i++) {
    result.push(Math.round(dataDiff[i] / timeDiff[i]));
  }
  return result;
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
  let APGain = (timestamp * 1000 - Date.now()) / 1000 / 60 / 5;
  let boundedAPGain = Math.max(Math.floor(APGain), 0);
  let APText = `${boundedAPGain} AP will regen until the next raids.`;
  return createPText(APText);
}

function bossesListString(bosses, prefix = "") {
  let bossesString = prefix;
  if (bosses.length > 1) {
    bossesString += bosses.slice(0, -1).join(", ") + " and ";
  }
  bossesString += bosses.slice(-1);
  return bossesString;
}

function genOpts(data1, data2, syncExtremes) {
  return {
    chart: {
      style: {
        fontFamily: "Fira Sans",
      },
      zoomType: "x",
      height: 500,
    },
    title: {
      text: "GUDAGUDA 2 rerun points",
      style: {
        fontSize: "1.5em",
      },
    },
    xAxis: {
      title: {
        text: "Pacific Time",
        style: {
          fontSize: "1.25em",
        },
      },
      type: "datetime",
      gridLineWidth: 1,
      crosshair: {
        // width: 2,
        // color: "gray",
        dashStyle: "Dash",
      },
      labels: {
        style: {
          fontSize: "1.15em",
        },
      },
      events: {
        setExtremes: syncExtremes,
      },
    },
    yAxis: {
      title: {
        text: "Points",
        style: {
          fontSize: "1.25em",
        },
      },
      labels: {
        style: {
          fontSize: "1.15em",
        },
      },
    },
    tooltip: {
      shadow: false,
      animation: false,
      shared: true,
      style: {
        fontSize: "1.15em",
      },
      positioner: function () {
        return { x: 80, y: 50 };
      },
    },
    legend: {
      enabled: true,
    },
    credits: {
      enabled: false,
    },
    plotOptions: {
      line: {
        marker: {
          radius: 4,
        },
        lineWidth: 2,
        states: {
          hover: false,
        },
        threshold: null,
        boostThreshold: 1,
      },
    },
    series: [
      {
        type: "line",
        name: "Oda Bakufu",
        data: data1,
        color: "#A22A2A",
      },
      {
        type: "line",
        name: "Shinshengumi",
        data: data2,
        color: "#5FAAD4",
      },
    ],
  };
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

  const raidData = await fetch("data.json").then((response) => response.json());
  let phase4data = raidData[1]["data"];
  let timeArray = phase4data[0];
  let odaArray = phase4data[1];
  let shinshengumiArray = phase4data[2];
  let outArray = highChartsArray(odaArray, timeArray);
  let outArray2 = highChartsArray(shinshengumiArray, timeArray);

  Accessibility(Highcharts);
  Exporting(Highcharts);
  ExportData(Highcharts);
  // Boost(Highcharts);

  /**
   * In order to synchronize tooltips and crosshairs, override the
   * built-in events with handlers defined on the parent element.
   */
  ["mousemove", "touchmove", "touchstart"].forEach(function (eventType) {
    document.getElementById("charts").addEventListener(eventType, function (e) {
      for (let i = 0; i < Highcharts.charts.length; i++) {
        let chart = Highcharts.charts[i];
        let event = chart.pointer.normalize(e); // Find coordinates within the chart
        let point;
        for (let j = 0; j < chart.series.length && !point; j++) {
          point = chart.series[j].searchPoint(event, true);
        }
        if (point) {
          if (e.type === "mousemove") {
            point.onMouseOver();
            chart.xAxis[0].drawCrosshair(event, point);
          } else {
            point.onMouseOut();
            chart.tooltip.hide(point);
            chart.xAxis[0].hideCrosshair();
          }
        }
      }
    });
  });

  /**
   * Override the reset function, we don't need to hide the tooltips and
   * crosshairs.
   */
  Highcharts.Pointer.prototype.reset = function () {
    return undefined;
  };

  /**
   * Highlight a point by showing tooltip, setting hover state and draw crosshair
   */
  Highcharts.Point.prototype.highlight = function (event) {
    event = this.series.chart.pointer.normalize(event);
    this.onMouseOver(); // Show the hover marker
    this.series.chart.tooltip.refresh([this]); // Show the tooltip
    this.series.chart.xAxis[0].drawCrosshair(event, this); // Show the crosshair
  };

  /**
   * Synchronize zooming through the setExtremes event handler.
   */
  function syncExtremes(e) {
    var thisChart = this.chart;
    if (e.trigger !== "syncExtremes") {
      // Prevent feedback loop
      Highcharts.each(Highcharts.charts, function (chart) {
        if (chart !== thisChart) {
          if (chart.xAxis[0].setExtremes) {
            // It is null while updating
            chart.xAxis[0].setExtremes(e.min, e.max, undefined, false, {
              trigger: "syncExtremes",
            });
          }
        }
      });
    }
  }

  Highcharts.setOptions({
    lang: {
      numericSymbols: ["K", "M", "B", "T", "P", "E"],
    },
    time: {
      timezoneOffset: 7 * 60, // Pacific time zone
    },
  });
  Highcharts.chart("hpChart", genOpts(outArray, outArray2, syncExtremes));

  let outdpsArray = highChartsArray(
    rate(odaArray, timeArray),
    timeArray.slice(1)
  );
  let outdpsArray2 = highChartsArray(
    rate(shinshengumiArray, timeArray),
    timeArray.slice(1)
  );
  Highcharts.chart(
    "dpsChart",
    genOpts(outdpsArray, outdpsArray2, syncExtremes)
  );
}
main();
