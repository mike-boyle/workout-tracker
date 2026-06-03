import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Google Analytics collection endpoint
  http.post('https://www.google-analytics.com/g/collect', () => {
    return new HttpResponse(null, { status: 200 });
  }),
  http.post('https://region1.google-analytics.com/g/collect', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Mock Firebase logging / analytics endpoints
  http.post('https://firebaselogging-pa.googleapis.com/v1/firelog/legacy/log', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Mock Firebase App Check provider validation or general config fetches if they happen
  http.post('https://firebaseappcheck.googleapis.com/*', () => {
    return HttpResponse.json({});
  }),
];
