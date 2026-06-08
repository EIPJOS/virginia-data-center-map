# Data Center Alley Monitor

A portfolio-ready Virginia data center intelligence dashboard.

This first version is a dependency-free static web app so it can run before the local Node/npm install is fixed. It uses CDN versions of Leaflet and Chart.js, plus a local seed dataset.

## Run Locally

Open `index.html` in a browser, or serve the folder with any static server.

Once Node/npm is working:

```powershell
npx serve .
```

## Current Features

- Dark mission-control dashboard
- Leaflet map centered on Virginia
- Data center cluster markers
- County, status, and operator filters
- Existing / under construction / proposed layer toggles
- Facility detail inspector
- County and demand charts
- Pressure score and watchlist

## Data Notes

The current records are cluster-level seed data for prototyping. Coordinates are approximate centroids. Before presenting this as a complete inventory, replace these with parcel-level records from county GIS, official planning pages, or a vetted commercial/open dataset.

## Next Data Milestones

- Add parcel-level Loudoun and Prince William records
- Add PJM load/price snapshot widget
- Add NOAA weather alert layer
- Add source-confidence labels per facility
