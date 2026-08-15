import { NextRequest, NextResponse } from 'next/server';
import { GoogleServiceAccountEngine } from '@/lib/googleServiceAccount';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credentials, sheetId } = body;

    const result = await GoogleServiceAccountEngine.testConnection(
      credentials,
      sheetId || '1s0a4QFIbE7uOpmSQX29279JswMvAOaX2z93kh5v36B0'
    );

    return NextResponse.json({
      status: 'SUCCESS',
      message: `Successfully connected to Google Sheet: "${result.title}"`,
      sheetTitle: result.title,
      sheetId: result.sheetId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'ERROR',
        message: error.message || 'Failed to connect using Service Account.',
      },
      { status: 400 }
    );
  }
}
