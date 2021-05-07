import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";
import { ASAP } from "downsample";
import * as Highcharts from "highcharts";
import Accessibility from "highcharts/modules/accessibility";
import Boost from "highcharts/modules/boost";
import ExportData from "highcharts/modules/export-data";
import Exporting from "highcharts/modules/exporting";
import { nth } from "lodash-es";

function createPText(string: string) {
  let newPElement = document.createElement("p");
  newPElement.innerText = string;
  return newPElement;
}

function rate(dataTimeArray: [number, number][], dataScale?: number) {
  let scale = 1;
  if (dataScale) {
    scale = dataScale;
  } else {
    for (let i = 1; i < dataTimeArray.length; i++) {
      scale = Math.sign(dataTimeArray[i][1] - dataTimeArray[i - 1][1]);
      if (scale !== 0) {
        break;
      }
    }
  }
  let startArray = dataTimeArray.slice(0, -1);
  let endArray = dataTimeArray.slice(1);
  let outArray: [number, number][] = [];
  for (let i = 0; i < startArray.length; i++) {
    let [startTime, startData] = startArray[i];
    let [endTime, endData] = endArray[i];
    let rate = ((endData - startData) * scale) / (endTime - startTime);
    outArray.push([startTime, rate]);
  }
  return outArray;
}

function calcETA(hpTime: [number, number][], target: number, n: number) {
  n = Math.min(n, hpTime.length);
  let [lastTime, lastData] = nth(hpTime, -1) || [1, 1];
  let [firstTime, firstData] = nth(hpTime, -n) || [0, 0];
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
  xAxisTitle?: string;
  yAxisTitle?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  valueDecimals?: number;
}

const fontFamily = `
"Fira Sans",
-apple-system, "BlinkMacSystemFont",
"Segoe UI", Helvetica, Arial,
sans-serif, "Apple Color Emoji", "Segoe UI Emoji"
`;

function genOpts(
  data: Record<string, [number, number][]>,
  config: chartConfig
) {
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
        fontFamily: fontFamily,
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
        text: config.xAxisTitle,
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
      shape: "square" as Highcharts.TooltipShapeValue,
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

interface eventConfig {
  pageTitle: string;
  etaLookBack: number;
  timezoneOffset: number;
  timezoneName: string;
  hpTitle: string;
  hpUnit: string;
  dpsTitle: string;
  dpsUnit: string;
}

interface raidData {
  data: Record<string, [number, number][]>;
  target: Record<string, number[]>;
  scale: Record<string, number>;
  startTime: Record<string, number[]>;
  endTime: Record<string, number[]>;
  config: eventConfig;
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
  const config = data["config"];

  const pageTitleDiv = document.getElementById("pageTitle")!;
  pageTitleDiv.innerText = config.pageTitle;

  let etaResult: etaResult[] = [];
  let runTime: runTime[] = [];
  for (const [boss, bossData] of Object.entries(hpTimeData)) {
    for (let i = 0; i < targetData[boss].length; i++) {
      let bossTarget = targetData[boss][i];
      let lastBossData = nth(bossData, -1);
      if (lastBossData && lastBossData[1] < bossTarget) {
        let eta = calcETA(bossData, bossTarget, config.etaLookBack);
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
    const etaTextDiv = document.getElementById("etaText")!;
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
    const runtimeText = document.getElementById("runtimeText")!;
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

  let eventTypes = ["mousemove", "mouseleave", "touchstart", "touchmove"];

  eventTypes.forEach(function (eventType) {
    document
      .getElementById("charts")!
      .addEventListener(eventType, function (e: Event) {
        for (let chart of Highcharts.charts) {
          if (chart) {
            let event = chart.pointer.normalize(
              e as MouseEvent | PointerEvent | TouchEvent
            ); // Find coordinates within the chart
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
    let highchartsEvent = this.series.chart.pointer.normalize(event);
    this.onMouseOver(); // Show the hover marker
    this.series.chart.tooltip.refresh(this); // Show the tooltip
    this.series.chart.xAxis[0].drawCrosshair(highchartsEvent, this); // Show the crosshair
  };

  /**
   * Synchronize zooming through the setExtremes event handler.
   */
  function syncExtremes(
    this: Highcharts.Series,
    e: Highcharts.AxisSetExtremesEventObject
  ) {
    let thisChart = this.chart;
    if (e.trigger !== "syncExtremes") {
      // Prevent feedback loop
      Highcharts.charts.forEach(function (chart) {
        if (chart && chart !== thisChart) {
          if (chart.xAxis) {
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
      timezoneOffset: config.timezoneOffset * 60,
    },
  });

  let scaledHpData: Record<string, [number, number][]> = {};
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

  let hpData: Record<string, [number, number][]> = {};
  for (const [boss, bossData] of Object.entries(scaledHpData)) {
    hpData[boss] = bossData.map((x) => [x[0] * 1000, x[1]]);
  }

  Highcharts.chart(
    "hpChart",
    genOpts(hpData, {
      title: config.hpTitle,
      xAxisTitle: config.timezoneName,
      yAxisTitle: config.hpUnit,
      // yAxisMin: etaResult.length < 6 ? 0 : null,
      // yAxisMax: 1000,
      valueDecimals: 0,
      syncExtremes: syncExtremes,
    })
  );

  let dpsData: Record<string, [number, number][]> = {};
  for (const [boss, bossData] of Object.entries(scaledHpData)) {
    const rateData = rate(bossData);
    const chartWidth = Math.min(500, Math.round(rateData.length / 2));
    const smoothedData = ASAP(rateData, chartWidth) as {
      x: number;
      y: number;
    }[];
    dpsData[boss] = smoothedData.map((point) => [point.x * 1000, point.y]);
  }

  Highcharts.chart(
    "dpsChart",
    genOpts(dpsData, {
      title: config.dpsTitle,
      xAxisTitle: config.timezoneName,
      yAxisTitle: config.dpsUnit,
      valueDecimals: 2,
      syncExtremes: syncExtremes,
    })
  );
}

main();
