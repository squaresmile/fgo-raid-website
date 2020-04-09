import { formatDistanceStrict } from "date-fns";
import { format } from "date-fns-tz";

async function main() {
  const etaData = await fetch("data/eta.json").then((response) =>
    response.json()
  );
  const etaTextDiv = document.getElementById("etaText");
  for (const eta of etaData) {
    var etaText = document.createElement("p");
    var etaDate = new Date(eta["ETA"] * 1000);
    var dateString = format(etaDate, "M/d HH:mm zzz");
    var difference = formatDistanceStrict(etaDate, Date.now(), {
      addSuffix: true,
      roundingMethod: "floor",
    });
    etaText.innerHTML = `${eta["Boss"]}: ${difference} (${dateString})`;
    etaTextDiv.appendChild(etaText);
  }
}
main();
