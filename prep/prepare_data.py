"""Data preparation for Demo 3 (the KNIME step of the labs, written in Python).

Reads the raw files in data/raw/ and writes the two tidy CSVs the D3 pages load:

  data/developed-prison-population.csv  -> index.html  (bubble map + bar chart)
  data/states-vs-countries.csv          -> states.html (ranked bar chart)

Run from the demo3 folder:  python3 prep/prepare_data.py
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"

# 1. Latest prison population rate (per 100,000 people) for every country
latest = {}
with open(RAW / "prison-population-rate.csv", newline="") as f:
    for row in csv.DictReader(f):
        year = int(row["Year"])
        name = row["Entity"]
        if name not in latest or year > latest[name]["year"]:
            latest[name] = {"year": year, "rate": float(row["Prison population rate"])}

# 2. Population by country and year (Our World in Data)
population = {}
with open(RAW / "owid-population.csv", newline="") as f:
    for row in csv.DictReader(f):
        population.setdefault(row["entity"], {})[int(row["year"])] = int(row["population_historical"])

def population_for(country, year):
    """Population in the rate's year, or the closest earlier year we have."""
    years = [y for y in population[country] if y <= year]
    best = max(years)
    return population[country][best], best

# 3. Developed countries = IMF "advanced economies" (minus Puerto Rico, a US territory)
with open(RAW / "developed-countries.csv", newline="") as f:
    developed = list(csv.DictReader(f))

rows = []
for c in developed:
    name = c["country"]
    rate = latest[name]
    pop, pop_year = population_for(name, rate["year"])
    rows.append({
        "country": name,
        "iso3": c["iso3"],
        "isoNumeric": c["isoNumeric"],
        "lat": c["lat"],
        "lon": c["lon"],
        "year": rate["year"],
        "rate": round(rate["rate"]),
        "population": pop,
        "populationYear": pop_year,
        # estimated number of people in prison = rate per 100k x population / 100k
        "prisoners": round(rate["rate"] * pop / 100_000),
    })
rows.sort(key=lambda r: r["prisoners"], reverse=True)

with open(ROOT / "data" / "developed-prison-population.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

# 4. U.S. states (Prison Policy Initiative 2024) + developed countries in one ranking
ranking = []
with open(RAW / "ppi-state-incarceration-rates-2024.csv", newline="") as f:
    for row in csv.DictReader(f):
        ranking.append({"name": row["state"], "type": "state", "rate": int(row["rate"]),
                        "year": 2024, "source": "Prison Policy Initiative"})

# U.S. national rate on the same basis as the states (PPI 2024, all forms of confinement)
ranking.append({"name": "United States", "type": "us", "rate": 614,
                "year": 2024, "source": "Prison Policy Initiative"})

for r in rows:
    if r["country"] == "United States":
        continue
    ranking.append({"name": r["country"], "type": "country", "rate": r["rate"],
                    "year": r["year"], "source": "World Prison Brief via Our World in Data"})

ranking.sort(key=lambda r: r["rate"], reverse=True)
with open(ROOT / "data" / "states-vs-countries.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["name", "type", "rate", "year", "source"])
    w.writeheader()
    w.writerows(ranking)

us = next(r for r in rows if r["country"] == "United States")
others = sum(r["prisoners"] for r in rows if r["country"] != "United States")
print(f"{len(rows)} developed countries; US {us['prisoners']:,} vs all others {others:,}")
print(f"{len(ranking)} rows in the state ranking")
