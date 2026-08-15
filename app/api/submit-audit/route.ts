import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scriptUrl, ...payload } = body;

    const targetUrl =
      scriptUrl ||
      process.env.NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL ||
      'https://script.google.com/a/macros/borosil.com/s/AKfycbzSZI42dnh2VvSExq121cqhArASSDNYv4txm3rxtK9FTSxTuT91Id8ItWr9m_srjs10/exec';

    if (!targetUrl) {
      return NextResponse.json(
        { status: 'ERROR', message: 'No Google Apps Script URL configured.' },
        { status: 400 }
      );
    }

    // Node.js server-to-server POST request:
    // 1. Zero browser CORS restrictions
    // 2. Automatically follows Google Apps Script 302 redirects with full body preserved
    // 3. Handles full high-resolution image uploads seamlessly
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await res.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      result = {
        status: 'SUCCESS',
        message: 'Processed by Google Apps Script',
        raw: text,
      };
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API submit-audit error]', err);
    return NextResponse.json(
      { status: 'ERROR', message: err.message || 'Server error transmitting audit to Google Apps Script' },
      { status: 500 }
    );
  }
}
