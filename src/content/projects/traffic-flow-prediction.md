---
title: Traffic Flow Prediction
hook: R² ≈ 0.94 on real freeway data
summary: Compared LSTM, GRU and stacked autoencoder models to forecast short-term freeway traffic flow from Caltrans PeMS 5-minute sensor data.
order: 2
role: Final-year university project
period: BUBT · 2022
context: Short-term traffic forecasting from real freeway sensor data.
stack: [Python, Keras, TensorFlow, scikit-learn, pandas, NumPy, Matplotlib]
metrics:
  - { value: '≈ 0.94', label: R² (stacked autoencoders) }
  - { value: '≈ 9.6', label: RMSE (vehicles per 5 min) }
  - { value: '3', label: deep-learning models compared }
links:
  - { label: Source code, url: 'https://github.com/RakibulIslam39/traffic-flow-prediction-Python' }
---

## The problem

Short-term traffic forecasts help with signal timing and route planning. The question for this capstone project: which deep-learning architecture predicts freeway flow best from sensor data that arrives every 5 minutes?

## What we built

- **Data.** Freeway sensor readings from Caltrans PeMS, sampled every 5 minutes.
- **Preparation.** The readings were scaled, then cut into input windows of the previous 12 readings, the last hour of traffic, to predict the next value.
- **Models.** Three architectures trained and tested on the same data: **LSTM**, **GRU** and **stacked autoencoders (SAEs)**.
- **Evaluation.** Every model was scored with MAE, MSE, RMSE, MAPE, R² and explained variance, so the comparison didn't hang on a single number.

## The result

The **stacked autoencoders** model gave the best result, with **R² of about 0.94** and an **RMSE of about 9.6 vehicles per 5 minutes**.

## What it taught me

Software Testing and Quality Assurance was the course that shaped me most at university, and this project used the same habit: decide how you'll measure "good" before you build, then measure everything the same way. Six metrics on one shared test set made the comparison fair.

## Credits

The model code is based on an open-source traffic flow prediction project released under the MIT licence. The data comes from the Caltrans Performance Measurement System (PeMS).
