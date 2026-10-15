import "server-only";

// https://developer.dentally.co -- confirmed endpoints, request/response
// shapes and the User-Agent requirement from Dentally's public docs.
// NOT confirmed: the exact Authorization header format (their docs don't
// state it). Rather than guess, the Integrations page asks for the whole
// header value verbatim ("Bearer xxx", "Token xxx", whatever Dentally
// support gives you) instead of assuming a scheme.
const BASE_URL = "https://api.dentally.co/v1";

function headers(authHeaderValue: string) {
  return {
    Authorization: authHeaderValue,
    "User-Agent": "Fernwell Patient Portal",
    "Content-Type": "application/json",
  };
}

// Only an explicit auth rejection fails the check -- any other response
// (including validation errors) still means the credentials got through.
// This is also how a wrong header format gets caught immediately.
export async function testDentallyConnection(authHeaderValue: string) {
  const res = await fetch(`${BASE_URL}/patients?query=test`, {
    headers: headers(authHeaderValue),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Dentally rejected that Authorization header -- check the exact value Dentally gave you.",
    );
  }
}

export type DentallyPatient = {
  id: string;
  first_name: string;
  last_name: string;
  email_address?: string;
  mobile_phone?: string;
};

export async function searchDentallyPatients(
  authHeaderValue: string,
  query: string,
): Promise<DentallyPatient[]> {
  const res = await fetch(
    `${BASE_URL}/patients?query=${encodeURIComponent(query)}`,
    { headers: headers(authHeaderValue) },
  );
  if (!res.ok) {
    throw new Error(`Dentally search failed: ${await res.text()}`);
  }
  const body = await res.json();
  return body.patients ?? body;
}

export async function createDentallyPatient(
  authHeaderValue: string,
  patient: {
    title: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    ethnicity: string;
    address_line_1: string;
    postcode: string;
    payment_plan_id: string;
    email_address?: string;
    mobile_phone?: string;
  },
): Promise<DentallyPatient> {
  const res = await fetch(`${BASE_URL}/patients`, {
    method: "POST",
    headers: headers(authHeaderValue),
    body: JSON.stringify({ patient }),
  });
  if (!res.ok) {
    throw new Error(`Dentally patient creation failed: ${await res.text()}`);
  }
  const body = await res.json();
  return body.patient ?? body;
}
