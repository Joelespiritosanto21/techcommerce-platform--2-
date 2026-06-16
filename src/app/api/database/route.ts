/**
 * Database Management API
 * GET: Get database status and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get database configuration
    const config = databaseManager.getConfig();
    
    // Test connection
    const connectionTest = await databaseManager.testConnection();
    
    // Get statistics
    const stats = await databaseManager.getStats();
    
    // Get backups list
    const backups = await databaseManager.listBackups();

    return NextResponse.json({
      success: true,
      data: {
        config: {
          type: config.type,
          host: config.host,
          port: config.port,
          name: config.name,
          // Don't expose password
        },
        connection: connectionTest,
        statistics: {
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          tables: stats.tables,
          records: stats.records,
        },
        backups: backups.slice(0, 10).map(b => ({
          id: b.id,
          filename: b.filename,
          size: b.size,
          sizeFormatted: formatBytes(b.size),
          createdAt: b.createdAt,
          type: b.type,
          compressed: b.compressed
        })),
        backupsTotal: backups.length
      }
    });
  } catch (error: any) {
    console.error('Database status error:', error);
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
