---
title: AI Face Analyzer
hook: Age, emotion and gender from one photo
summary: A FastAPI web app that uses DeepFace and OpenCV to analyse every face in an uploaded or camera photo, with a Bengali interface, API tests and a load-test scenario.
order: 3
role: Solo side project
period: 'Side project · 2026'
context: A face-analysis web app with a tested API behind it.
stack: [Python, FastAPI, DeepFace, OpenCV, pytest, Locust, Docker]
metrics:
  - { value: '7', label: emotion categories }
  - { value: '5', label: image formats validated }
  - { value: 'Multi', label: faces per photo }
links:
  - { label: Source code, url: 'https://github.com/RakibulIslam39/ai-face-analyzer' }
---

## What it does

Upload a photo, drag one in or take one with the camera. The app finds every face and estimates age, emotion (angry, disgust, fear, happy, sad, surprise or neutral) and gender for each one, with confidence scores, the face region and a thumbnail.

Labels and error messages are in Bengali, in both the interface and the API responses.

## How it's built

- **Backend:** Python, FastAPI and Uvicorn.
- **Analysis:** DeepFace on TensorFlow/Keras, with OpenCV for face detection.
- **Frontend:** a single page in plain HTML, CSS and JavaScript.
- **Deployment:** a Docker image that preloads the models at build time, with a Render service config.

## How it's tested

- **Input validation.** Only JPEG, PNG, WebP, GIF and BMP files get through, and there are limits on file size and image dimensions.
- **API tests** with pytest and HTTPX cover the routes and the validation rules.
- **Load testing** with a Locust scenario.
- **Hardening:** per-IP rate limiting and security response headers.
