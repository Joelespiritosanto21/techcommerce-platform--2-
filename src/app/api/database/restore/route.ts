/**
 * Database Restore API
 * POST: Restore database from backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.backupPath && !body.backupId) {
      return NextResponse.json({
        success: false,
        error: 'backupPath or backupId is required'
      }, { status: 400 });
    }

    // Decode backup ID if provided
    let backupPath = body.backupPath;
    if (!backupPath && body.backupId) {
      const filename = Buffer.from(body.backupId, 'base64').toString();
      backupPath = `/var/backups/techcommerce/${filename}`;
    }

    const result = await databaseManager.restoreBackup({
      backupPath,
      dropExisting: body.dropExisting || false,
      tables: body.tables
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Restore backup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
