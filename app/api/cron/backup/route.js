import { NextResponse } from 'next/server';
import { performAutoBackupToGoogleDrive } from '../../../lib/api/system.js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handleCronBackup(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim()) return NextResponse.json({ error: 'Backup schedule is unconfigured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        error: 'Automated backup failed'
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
