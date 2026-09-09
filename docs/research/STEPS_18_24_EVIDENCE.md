# Steps 18–24 backend/QA evidence

This branch keeps gameplay validation independent from Research validation. The Research backend accepts N6 communication/data events and N7 final-point events only. Session completion requires N7 `level_completed` plus `session_completed`; N7 `data_sent` is not required.
