---
title: Traffic Flow Prediction
hook: R² ≈ 0.94 on real freeway data
summary: Compared LSTM, GRU and stacked autoencoder models to forecast short-term freeway traffic flow from Caltrans PeMS 5-minute sensor data.
order: 2
role: Final-year university project
period: BUBT · 2022
context: Short-term traffic forecasting from real freeway sensor data.
stack: [Python, Keras, TensorFlow, scikit-learn]
metrics:
  - { value: '≈ 0.94', label: R² }
  - { value: '≈ 9.6', label: RMSE (vehicles) }
  - { value: '3', label: deep-learning models compared }
links:
  - { label: Source code, url: 'https://github.com/RakibulIslam39/traffic-flow-prediction-Python' }
placeholder: true
---

## The problem

Short-term traffic forecasts help with signal timing and route planning. The question for this project: which deep-learning architecture predicts freeway flow best from sensor data that arrives every 5 minutes?

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. <!-- TODO -->

## What we built

- Training data from Caltrans PeMS freeway sensors, sampled every 5 minutes.
- Three models trained and compared on the same data: **LSTM**, **GRU** and **stacked autoencoders (SAEs)**.
- Evaluation of all three with R² and RMSE.

## The result

The best model reached **R² ≈ 0.94** with an **RMSE of about 9.6 vehicles**.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. <!-- TODO: which model won, and why you think it did. -->

## What I'd do next

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. <!-- TODO -->
