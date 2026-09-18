import { NextResponse } from 'next/server';
import { performAutoBackupToGoogleDrive } from '../../../lib/api/system.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handleCronBackup(request) {
  // Verify Cron Secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret');

    const provided = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : querySecret;
    if (provided !== cronSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }
  }

  try {
    const result = await performAutoBackupToGoogleDrive('cron');
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backup: result
    });
  } catch (error) {
    console.error('Automated Cron Backup Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Automated backup failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleCronBackup(request);
}

export async function POST(request) {
  return handleCronBackup(request);
}
