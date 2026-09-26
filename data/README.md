# Historical replay data

`oil_history.json` contains paired daily Brent and WTI spot observations for
2023–2025. `oil_spot_source.csv` preserves the downloaded source bytes; their
SHA-256 and retrieval time appear in the JSON metadata. Missing paired prices
are excluded without forward filling.

Source: U.S. Energy Information Administration, retrieved from FRED, Federal
Reserve Bank of St. Louis:
[Brent](https://fred.stlouisfed.org/series/DCOILBRENTEU) and
[WTI](https://fred.stlouisfed.org/series/DCOILWTICO).

These are historical spot references, not executable futures quotes. The
download reflects the current series vintage. The replay enforces sequential
observation access and a one-observation execution lag, but does not reproduce
original publication delays or revisions. It establishes computational
causality under its stated timing model, not a bias-free live-trading backtest.

`npm run data:refresh` deliberately refreshes the fixture from the two source
series. Normal tests, replay and dashboard operation use the checked-in local
fixture and make no data requests. Forward, funding and volatility curves from
the mock service are synthetic and labelled separately.
