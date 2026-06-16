/**
 * Database Export API
 * POST: Export database to SQL, JSON, or CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const format = body.format || 'sql';
    
    if (!['sql', 'json', 'csv'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Use sql, json, or csv.'
      }, { status: 400 });
    }

    const result = await databaseManager.export({
      format: format as 'sql' | 'json' | 'csv',
      outputPath: body.outputPath,
      tables: body.tables
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          path: result.path,
          format
        },
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Export database error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
