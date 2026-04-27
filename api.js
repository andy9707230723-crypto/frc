const BASE_URL = "https://www.thebluealliance.com/api/v3";

async function request(path, apiKey) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-TBA-Auth-Key": apiKey,
    },
  });

  if (response.status === 401) {
    throw new Error("INVALID_API_KEY");
  }

  if (response.status === 404) {
    throw new Error("EVENT_NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error("FETCH_FAILED");
  }

  return response.json();
}

export async function fetchEventOprs(eventKey, apiKey) {
  return request(`/event/${eventKey}/oprs`, apiKey);
}

export async function fetchEventRankings(eventKey, apiKey) {
  return request(`/event/${eventKey}/rankings`, apiKey);
}
