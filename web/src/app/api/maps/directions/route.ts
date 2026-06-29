import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin      = searchParams.get("origin");
  const destination = searchParams.get("destination");

  if (!origin || !destination) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const key = process.env.GOONG_API_KEY;
  if (!key) return NextResponse.json({ error: "GOONG_API_KEY not set" }, { status: 500 });

  const url = new URL("https://rsapi.goong.io/Direction");
  url.searchParams.set("origin",      origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("vehicle",     "car");
  url.searchParams.set("api_key",     key);

  const res  = await fetch(url.toString());
  const data = await res.json();

  if (data.geocoded_waypoints?.length === 0 || !data.routes?.[0]) {
    return NextResponse.json({ error: "NO_ROUTE" }, { status: 404 });
  }

  const route = data.routes[0];
  return NextResponse.json({
    polyline:  route.overview_polyline.points,
    distanceM: route.legs.reduce((s: number, l: { distance: { value: number } }) => s + l.distance.value, 0),
    durationS: route.legs.reduce((s: number, l: { duration: { value: number } }) => s + l.duration.value, 0),
  });
}
