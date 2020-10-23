import { formatDistanceToNowStrict, formatDistanceToNow } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";
import * as Highcharts from "highcharts";
import Accessibility from "highcharts/modules/accessibility";
import Boost from "highcharts/modules/boost";
import Exporting from "highcharts/modules/exporting";
import ExportData from "highcharts/modules/export-data";
import { nth } from "lodash-es";

function createPText(string: string) {
  let newPElement = document.createElement("p");
  newPElement.textContent = string;
  return newPElement;
}

function createHighChartsArray(timeData: number[][]) {
  return timeData.map((x) => [x[0] * 1000, x[1]]);
}

function rate(dataTimeArray: number[][], scale: number = null) {
  if (!scale) {
    scale = Math.sign(dataTimeArray[1][1] - dataTimeArray[0][1]);
  }
  let startArray = dataTimeArray.slice(0, -1);
  let endArray = dataTimeArray.slice(1);
  let outArray: number[][] = [];
  for (let i = 0; i < startArray.length; i++) {
    let [startTime, startData] = startArray[i];
    let [endTime, endData] = endArray[i];
    let rate = ((endData - startData) * scale) / (endTime - startTime);
    outArray.push([startTime, rate]);
  }
  return outArray;
}

function calcETA(hpTime: number[][], target: number, n: number) {
  n = Math.min(n, hpTime.length);
  let [lastTime, lastData] = nth(hpTime, -1);
  let [firstTime, firstData] = nth(hpTime, -n);
  let dataDiff = lastData - firstData;
  let timeDiff = lastTime - firstTime;
  let avgRate = dataDiff / timeDiff;
  if (avgRate === 0) {
    avgRate = Math.sign(dataDiff);
  }
  let timeRemaining = (target - lastData) / avgRate;
  return lastTime + timeRemaining;
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

function getRuntimeText(start: number, end: number) {
  let seconds = end - start;
  let hour_str = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  seconds %= 3600;
  let minute_str = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  let second_str = (seconds % 60).toString().padStart(2, "0");
  return `${hour_str}:${minute_str}:${second_str}`;
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

interface chartConfig {
  title: string;
  syncExtremes?: (e: Highcharts.AxisSetExtremesEventObject) => void;
  yAxisTitle?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  valueDecimals?: number;
}

function genOpts(data: Record<string, number[][]>, config: chartConfig) {
  let series: Highcharts.SeriesOptionsType[] = [];
  for (const [boss, bossData] of Object.entries(data)) {
    series.push({
      type: "line",
      name: boss,
      data: bossData,
      // color: BOSS_COLOR[boss],
    });
  }
  return {
    chart: {
      style: {
        fontFamily: "Fira Sans",
      },
      zoomType: "x" as Highcharts.OptionsZoomTypeValue,
      marginLeft: 80,
    },
    title: {
      text: config.title,
      style: {
        fontSize: "1.75em",
      },
    },
    xAxis: {
      title: {
        text: "Japan Standard Time",
        style: {
          fontSize: "1.25em",
        },
      },
      type: "datetime" as Highcharts.AxisTypeValue,
      gridLineWidth: 1,
      crosshair: {
        // width: 2,
        // color: "gray",
        dashStyle: "Dash" as Highcharts.DashStyleValue,
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
      min: config.yAxisMin,
      max: config.yAxisMax,
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
        lineWidth: 1,
        states: {
          hover: {
            enabled: true,
          },
          inactive: {
            enabled: false,
          },
        },
        // threshold: null,
        boostThreshold: 1,
      },
    },
    series: series,
  };
}

interface raidData {
  data: Record<string, number[][]>;
  target: Record<string, number[]>;
  scale: Record<string, number>;
  startTime: Record<string, number[]>;
  endTime: Record<string, number[]>;
}

interface etaResult {
  boss: string;
  eta: number;
  target: number;
  manyTargets: boolean;
}

interface runTime {
  boss: string;
  target: number;
  startTime: number;
  endTime: number;
}

declare module "highcharts" {
  interface Point {
    highlight(event: PointerEvent | TouchEvent | MouseEvent): void;
  }
  interface Series {
    searchPoint(
      event: PointerEventObject,
      compareX: boolean
    ): Point | undefined;
  }
}

async function main() {
  const data: raidData = await fetch("data.json").then((response) =>
    response.json()
  );
  const hpTimeData = data["data"];
  const targetData = data["target"];
  const startTime = data["startTime"];
  const endTime = data["endTime"];

  let etaResult: etaResult[] = [];
  let runTime: runTime[] = [];
  for (const [boss, bossData] of Object.entries(hpTimeData)) {
    for (let i = 0; i < targetData[boss].length; i++) {
      let bossTarget = targetData[boss][i];
      if (nth(bossData, -1)[1] < bossTarget) {
        let eta = calcETA(bossData, bossTarget, 100);
        etaResult.push({
          boss: boss,
          eta: eta,
          target: bossTarget,
          manyTargets: targetData[boss].length > 1,
        });
      } else {
        let bossStartTime = startTime[boss];
        let bossEndTime = endTime[boss];
        if (
          bossStartTime.length >= i + 1 &&
          bossEndTime.length >= i + 1 &&
          bossEndTime[i] !== 0
        ) {
          runTime.push({
            boss: boss,
            target: bossTarget,
            startTime: bossStartTime[i],
            endTime: bossEndTime[i],
          });
        }
      }
    }
  }

  if (etaResult.length > 0) {
    const etaTextDiv = document.getElementById("etaText");
    etaResult = etaResult.sort((a, b) => a.eta - b.eta);
    for (const bossEta of etaResult) {
      let [dateString, difference] = futureStrings(bossEta.eta, true);
      let etaText;
      if (bossEta.manyTargets) {
        etaText = `${
          bossEta.boss
        } to reach ${bossEta.target.toLocaleString()}: ${difference} (${dateString})`;
      } else {
        etaText = `${bossEta.boss}: ${difference} (${dateString})`;
      }
      etaTextDiv.appendChild(createPText(etaText));
    }
  }

  if (runTime.length > 0) {
    const runtimeText = document.getElementById("runtimeText");
    runtimeText.appendChild(createPText("Boss run time:"));
    runTime = runTime.sort((a, b) => a.endTime - b.endTime);
    for (const bossRunTime of runTime) {
      let endDate = new Date(bossRunTime.endTime * 1000);
      const timeZone = "America/Los_Angeles";
      let zonedDate = utcToZonedTime(endDate, timeZone);
      let bossEndText = format(zonedDate, "M/d HH:mm zzz", { timeZone });
      let runtime = getRuntimeText(bossRunTime.startTime, bossRunTime.endTime);
      let runTimeText = `${bossRunTime.boss}: ${runtime} (${bossEndText})`;
      runtimeText.appendChild(createPText(runTimeText));
    }
  }

  Accessibility(Highcharts);
  Exporting(Highcharts);
  ExportData(Highcharts);
  Boost(Highcharts);

  /**
   * In order to synchronize tooltips and crosshairs, override the
   * built-in events with handlers defined on the parent element.
   */
  let stillGoingBoss = 0;
  let currentLength = 0;
  let bossNames = Object.keys(hpTimeData);
  for (let i = 0; i < bossNames.length; i++) {
    let boss = bossNames[i];
    if (hpTimeData[boss].length > currentLength) {
      stillGoingBoss = i;
      currentLength = hpTimeData[boss].length;
    }
  }

  ["mousemove", "mouseleave", "touchstart", "touchmove"].forEach(function (
    eventType
  ) {
    document
      .getElementById("charts")
      .addEventListener(eventType, function (
        e: PointerEvent | TouchEvent | MouseEvent
      ) {
        for (let i = 0; i < Highcharts.charts.length; i++) {
          let chart = Highcharts.charts[i];
          let event = chart.pointer.normalize(e); // Find coordinates within the chart
          let point = chart.series[stillGoingBoss].searchPoint(event, true);
          if (point) {
            if (["mousemove", "touchmove", "touchstart"].includes(e.type)) {
              point.onMouseOver();
              chart.xAxis[0].drawCrosshair(event, point);
            } else {
              point.onMouseOut();
              chart.tooltip.hide();
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
  Highcharts.Point.prototype.highlight = function (
    event: PointerEvent | TouchEvent | MouseEvent
  ) {
    event = this.series.chart.pointer.normalize(event);
    this.onMouseOver(); // Show the hover marker
    this.series.chart.tooltip.refresh(this); // Show the tooltip
    this.series.chart.xAxis[0].drawCrosshair(event, this); // Show the crosshair
  };

  /**
   * Synchronize zooming through the setExtremes event handler.
   */
  function syncExtremes(e: Highcharts.AxisSetExtremesEventObject) {
    var thisChart = this.chart;
    if (e.trigger !== "syncExtremes") {
      // Prevent feedback loop
      Highcharts.charts.forEach(function (chart) {
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
      timezoneOffset: 7 * 60, // Pacific Daylight Time
    },
  });

  let scaledHpData: Record<string, number[][]> = {};
  for (const [boss, bossData] of Object.entries(hpTimeData)) {
    let bossScale = data["scale"][boss];
    if (bossScale > 0) {
      scaledHpData[boss] = bossData.map((x) => [
        x[0],
        Math.max((targetData[boss][0] - x[1]) / data["scale"][boss], 0),
      ]);
    } else if (bossScale === -1) {
      scaledHpData[boss] = bossData;
    }
  }

  let hpData: Record<string, number[][]> = {};
  for (const [boss, bossData] of Object.entries(scaledHpData)) {
    hpData[boss] = createHighChartsArray(bossData);
  }

  Highcharts.chart(
    "hpChart",
    genOpts(hpData, {
      title: "NA Oniland Raid HP",
      yAxisTitle: "HP",
      // yAxisMin: etaResult.length < 6 ? 0 : null,
      // yAxisMax: 1000,
      valueDecimals: 0,
      syncExtremes: syncExtremes,
    })
  );

  let dpsData: Record<string, number[][]> = {};
  for (const [boss, bossData] of Object.entries(scaledHpData)) {
    dpsData[boss] = createHighChartsArray(
      rate(bossData.filter((x) => x[1] > 0))
    );
  }

  Highcharts.chart(
    "dpsChart",
    genOpts(dpsData, {
      title: "NA Oniland Raid DPS",
      yAxisTitle: "DPS (Damage per Second)",
      valueDecimals: 2,
      syncExtremes: syncExtremes,
    })
  );
}
main();
