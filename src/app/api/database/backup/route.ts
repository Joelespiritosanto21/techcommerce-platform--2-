/**
 * Database Backup API
 * GET: List backups
 * POST: Create new backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const backups = await databaseManager.listBackups();

    return NextResponse.json({
      success: true,
      data: backups.map(b => ({
        id: b.id,
        filename: b.filename,
        path: b.path,
        size: b.size,
        sizeFormatted: formatBytes(b.size),
        createdAt: b.createdAt,
        type: b.type,
        database: b.database,
        compressed: b.compressed
      }))
    });
  } catch (error: any) {
    console.error('List backups error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const options = {
      outputPath: body.outputPath,
      compress: body.compress !== false,
      includeData: body.includeData !== false,
      tables: body.tables
    };

    const backup = await databaseManager.createBackup(options);

    return NextResponse.json({
      success: true,
      data: {
        id: backup.id,
        filename: backup.filename,
        path: backup.path,
        size: backup.size,
        sizeFormatted: formatBytes(backup.size),
        createdAt: backup.createdAt,
        type: backup.type,
        compressed: backup.compressed
      },
      message: 'Backup created successfully'
    });
  } catch (error: any) {
    console.error('Create backup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
