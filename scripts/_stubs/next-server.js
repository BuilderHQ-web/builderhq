// Script-bundle stub for next/server: the scope scripts never execute
// the request-scoped paths that need it.
export class NextResponse extends Response {
  static json(body, init) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init && init.headers) },
    });
  }
}
export class NextRequest extends Request {}

// `after` schedules post-response work in Next; in scripts, run inline.
export function after(task) {
  if (typeof task === "function") { Promise.resolve().then(task); }
}
