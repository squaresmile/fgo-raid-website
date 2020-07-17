import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format } from "date-fns-tz";
import * as Highcharts from "highcharts";
import Accessibility from "highcharts/modules/accessibility";
import Exporting from "highcharts/modules/exporting";
import ExportData from "highcharts/modules/export-data";
import { nth, takeRight } from "lodash-es";
import Boost from "highcharts/modules/boost";

const BOSS_COLOR = {
  Fran: "#55A868",
  Helena: "#64B5CD",
  Nito: "#4C72B0",
  Nobu: "#C44E52",
  Raikou: "#8172B2",
  Sabers: "#CCB974",
};

function createPText(string) {
  let newPElement = document.createElement("p");
  newPElement.textContent = string;
  return newPElement;
}

function createHighChartsArray(dataArray, timeArray) {
  let outArray = [];
  for (let i = 0; i < dataArray.length; i++) {
    outArray.push([timeArray[i] * 1000, dataArray[i]]);
  }
  return outArray;
}

function diffArray(origArray) {
  let startArray = origArray.slice(0, -1);
  let endArray = origArray.slice(1);
  let outArray = [];
  for (let i = 0; i < startArray.length; i++) {
    outArray.push(endArray[i] - startArray[i]);
  }
  return outArray;
}

function rate(dataArray, timeArray, ascending) {
  let dataDiff = diffArray(dataArray);
  if (ascending === false) {
    dataDiff = dataDiff.map((x) => -x);
  }
  let timeDiff = diffArray(timeArray);
  let outArray = [];
  for (let i = 0; i < dataDiff.length; i++) {
    outArray.push(dataDiff[i] / timeDiff[i]);
  }
  return outArray;
}

function calcETA(dataArray, timeArray, target, n) {
  let slicedData = takeRight(dataArray, n);
  let slicedTime = takeRight(timeArray, n);
  let lastData = nth(slicedData, -1);
  let lastTime = nth(slicedTime, -1);
  let dataDiff = lastData - nth(slicedData, 0);
  let timeDiff = lastTime - nth(slicedTime, 0);
  let avgRate = dataDiff / timeDiff;
  if (avgRate === 0) {
    avgRate = Math.sign(dataDiff);
  }
  let timeRemaining = (target - lastData) / avgRate;
  return lastTime + timeRemaining;
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

// function calcAPGain(timestamp) {
//   let APGain = (timestamp * 1000 - Date.now()) / 1000 / 60 / 5;
//   let boundedAPGain = Math.max(Math.floor(APGain), 0);
//   let APText = `${boundedAPGain} AP will regen until the next raids.`;
//   return createPText(APText);
// }

// function bossesListString(bosses, prefix = "") {
//   let bossesString = prefix;
//   if (bosses.length > 1) {
//     bossesString += bosses.slice(0, -1).join(", ") + " and ";
//   }
//   bossesString += bosses.slice(-1);
//   return bossesString;
// }

function genOpts(data, config) {
  let series = [];
  for (const boss in data) {
    series.push({
      type: "line",
      name: boss,
      data: data[boss],
      color: BOSS_COLOR[boss],
    });
  }
  return {
    chart: {
      style: {
        fontFamily: "Fira Sans",
      },
      zoomType: "x",
      marginLeft: 70,
    },
    title: {
      text: config.title,
      style: {
        fontSize: "1.75em",
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
        setExtremes: config.syncExtremes,
      },
    },
    yAxis: {
      title: {
        text: config.yAxisTitle,
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
      valueDecimals: config.valueDecimals,
      style: {
        fontSize: "1.15em",
      },
      positioner: function () {
        return { x: 100, y: 50 };
      },
    },
    legend: {
      enabled: true,
      itemStyle: {
        fontSize: "1.15em",
      },
    },
    credits: {
      enabled: false,
    },
    exporting: {
      sourceWidth: 1000,
      sourceHeight: 500,
    },
    plotOptions: {
      line: {
        marker: {
          enabled: false,
        },
        lineWidth: 2,
        states: {
          hover: false,
        },
        threshold: null,
        boostThreshold: 1,
      },
    },
    series: series,
  };
}

async function main() {
  const data = await fetch("data.json").then((response) => response.json());
  let raidData = data["data"];
  let targetData = data["target"];
  let timeArray = raidData["timestamp"];
  delete raidData["timestamp"];

  let etaResult = [];
  for (const boss in raidData) {
    if (nth(raidData[boss], -1) !== 0) {
      let eta = calcETA(raidData[boss], timeArray, targetData[boss], 100);
      etaResult.push([boss, eta]);
    }
  }

  const etaTextDiv = document.getElementById("etaText");
  etaResult = etaResult.sort((a, b) => a[1] - b[1]);
  for (const [boss, eta] of etaResult) {
    let [dateString, difference] = futureStrings(eta, true);
    let etaText = `${boss}: ${difference} (${dateString})`;
    etaTextDiv.appendChild(createPText(etaText));
  }

  Accessibility(Highcharts);
  Exporting(Highcharts);
  ExportData(Highcharts);
  Boost(Highcharts);

  /**
   * In order to synchronize tooltips and crosshairs, override the
   * built-in events with handlers defined on the parent element.
   */
  ["mousemove", "mouseleave", "touchstart", "touchmove"].forEach(function (
    eventType
  ) {
    document.getElementById("charts").addEventListener(eventType, function (e) {
      for (let i = 0; i < Highcharts.charts.length; i++) {
        let chart = Highcharts.charts[i];
        let event = chart.pointer.normalize(e); // Find coordinates within the chart
        let point;
        for (let j = 0; j < chart.series.length && !point; j++) {
          point = chart.series[j].searchPoint(event, true);
        }
        if (point) {
          if (["mousemove", "touchmove", "touchstart"].includes(e.type)) {
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

  let scaledHpData = {};
  for (const boss in raidData) {
    scaledHpData[boss] = raidData[boss].map(
      (x) => (targetData[boss] - x) / data["scale"][boss]
    );
  }

  let hpData = {};
  for (const boss in scaledHpData) {
    hpData[boss] = createHighChartsArray(
      scaledHpData[boss].slice(1),
      timeArray.slice(1)
    );
  }

  Highcharts.chart(
    "hpChart",
    genOpts(hpData, {
      title: "NA Summer Race Rerun Distance",
      yAxisTitle: "Distance (m)",
      valueDecimals: 0,
      syncExtremes: syncExtremes,
    })
  );

  let dpsData = {};
  for (const boss in scaledHpData) {
    dpsData[boss] = createHighChartsArray(
      rate(scaledHpData[boss], timeArray, false),
      timeArray.slice(1)
    );
  }

  Highcharts.chart(
    "dpsChart",
    genOpts(dpsData, {
      title: "NA Summer Race Rerun Speed",
      yAxisTitle: "Speed (m/s)",
      valueDecimals: 2,
      syncExtremes: syncExtremes,
    })
  );
}
main();
