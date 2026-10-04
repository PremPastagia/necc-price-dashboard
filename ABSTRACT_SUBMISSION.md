# Conference & Journal Abstract Submission

**Title:** Administered Pricing and the Limits of Algorithmic Forecasting: Evidence from India's National Egg Coordination Committee  
**Author:** Prem Pastagia  
**Affiliation:** Independent Econometric Researcher / Advanced Agri-Analytics  
**Target Journal / Symposia:** *International Journal of Forecasting* (IJF) / International Conference on Agri-Commodity Analytics 2026  
**Subject Classification (JEL Codes):** C22 (Time-Series Models), C53 (Forecasting and Prediction Methods), Q11 (Aggregate Supply and Demand Analysis; Prices), Q13 (Agricultural Markets and Marketing)  
**Keywords:** Administered pricing, Agricultural commodity forecasting, National Egg Coordination Committee (NECC), Model parsimony, Regional performance paradox, Machine learning vs. Econometrics  

---

## 1. 250-Word Conference Abstract (Short Form)

This study investigates whether modern machine learning (ML) architectures outperform parsimonious time-series models in agricultural commodity markets governed by administered pricing mechanisms. Using a forensically reconstructed and validated daily panel of wholesale egg prices from India's National Egg Coordination Committee (NECC)—comprising 5,670 consecutive daily observations across 29 commercial centers from 2009 to 2026—we benchmark 31 forecasting models across 10 chronological rolling-origin evaluation windows (4,060 out-of-sample evaluations). 

Pre-estimation diagnostics confirm strict $I(1)$ unit root integration, ARCH volatility clustering, and a dominant national spatial factor accounting for 46.4% of total variance. Pairwise Granger causality proves that the southern production hub of Namakkal price-leads 27 of 28 destination markets ($p = 0.000$), while Barwala ($p = 0.121$) operates as an autonomous northern supply pole. 

We find that classical parsimonious models systematically dominate complex algorithms: TBATS (MASE = 3.176), Naïve random-walk (MASE = 3.177), and AutoARIMA (MASE = 3.192) outperform tree ensembles, while boosting models experience catastrophic generalization collapse (XGBoost MASE = 9.306; LightGBM MASE = 36.739). Furthermore, we discover a "Regional Performance Paradox": in southern production strongholds where NECC coordination is absolute, ML collapses completely; in peripheral northern/central consumption centers with transportation frictions, tree ensembles gain predictive traction. A horizon-aware structural ensemble (SARIMA for $h \le 14$ days, switching to Prophet for $h = 30$ days) delivers a 10.2% out-of-sample holdout error reduction. These findings demonstrate that in administered markets governed by institutional inertia, parsimonious models succeed because they match the underlying step-function data-generating process.

---

## 2. Extended Executive Abstract (Long Form / Symposium Review)

### Background & Research Question
In commodity price forecasting, empirical literature routinely assumes continuous auction-clearing spot dynamics where supply and demand curves intersect tick-by-tick. Under this assumption, complex machine learning (ML) architectures (e.g., gradient boosted trees and deep neural networks) are hypothesized to capture subtle non-linearities and supply shocks. However, vast agricultural markets across developing nations operate under administered pricing frameworks where producer committees periodically declare benchmark advisory prices. 

India's commercial egg industry—the world's third largest—is anchored by daily price declarations from the National Egg Coordination Committee (NECC) across 29 major commercial markets. This study resolves a foundational econometric question: *In markets governed by administrative inertia and discrete committee revisions, does algorithmic complexity add predictive value, or does it induce catastrophic overfitting?*

### Forensic Data Provenance
Auditing previous repositories revealed a pervasive data corruption issue: legacy scrapers failed to handle dynamic ASP.NET postback viewstate parameters, causing identical single-day prices to be replicated across 211 historical months. We engineered a robust ingestion pipeline with form state preservation, re-extracting and validating 5,670 consecutive daily observations (February 22, 2009 to July 11, 2026) across 29 commercial centers, confirmed by a 99.996% cross-archive validation against independent regional agricultural records.

### Econometric Pre-Estimation Diagnostics
1. **Unit Root Integration:** Augmented Dickey-Fuller (ADF) tests on price levels fail to reject non-stationarity ($p > 0.20$ across all 29 cities), while KPSS tests reject level and trend stationarity ($p < 0.01$). First differences are stationary ($p < 0.0001$), confirming universal $I(1)$ integration.
2. **Volatility Clustering:** ARCH-LM tests ($p < 0.001$) reveal significant conditional heteroscedasticity, tied to seasonal monsoon/summer supply stress and holiday consumption shifts.
3. **Spatial Factor Structure:** Principal Component Analysis (PCA) reveals that PC1 explains 46.4% of total variance across all 29 markets, reflecting centralized NECC price-setting coordination.
4. **Namakkal Price Leadership Theorem:** Pairwise Granger causality tests establish that the southern mega-production hub of Namakkal Granger-causes 27 of 28 destination markets ($p = 0.000000$). The sole autonomous market is Barwala, Haryana ($p = 0.121$), identifying it as the primary northern supply counterweight.

### The 31-Model Tournament & Empirical Findings
We benchmarked 31 models spanning four paradigms: (A) Classical Baselines & Exponential Smoothing, (B) Box-Jenkins & State-Space (ARIMA, TBATS, Theta), (C) Additive Decomposition (Facebook Prophet), and (D) 16 Machine Learning & Deep Learning algorithms. Models were tested over 10 chronological rolling-origin windows ($H = 14$ and $H = 30$ days) with strict untouched holdouts.

* **Parsimony Victorious:** TBATS (MASE = 3.176), Naïve Random Walk (MASE = 3.177), Holt-Winters (MASE = 3.179), and AutoARIMA (MASE = 3.192) achieve the lowest prediction error.
* **Boosting Collapse:** Gradient boosting models suffered severe extrapolation failure (XGBoost MASE = 9.306; LightGBM MASE = 36.739).
* **The Regional Performance Paradox:** In southern production belts where NECC enforcement is monolithic, ML fails completely (Random Forest MASE = 10.21 vs. Naïve MASE = 3.83). However, in distant northern and central consumption centers (Indore, Lucknow) where inter-state freight transit, market fees, and local dealer markups introduce localized non-linearities, tree ensembles outperform baselines (Extra Trees MASE = 2.049 in Indore).
* **Horizon-Aware Ensemble:** A dual-regime ensemble combining SARIMA for short horizons ($h \le 14$ days) and Prophet for extended cycles ($h = 30$ days) achieves an out-of-sample error reduction of 10.2%.

### Practical Application for Commercial Poultry Operators
These empirical findings are directly operationalized into an institutional trading terminal providing:
- Real-time lot trade execution against live NECC benchmarks.
- Inter-mandi spatial arbitrage freight calculators.
- SARIMA-driven cold storage holding advisories (`HOLD LOTS` vs. `DISPATCH NOW`) based on electricity and spoilage cost thresholds.
