export function GET() {
  return Response.json({
    ok: true,
    message: 'API functions working!',
    timestamp: new Date().toISOString(),
  });
}

