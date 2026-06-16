/**
 * Database Import API
 * POST: Import data from SQL, JSON, or CSV file
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.filePath) {
      return NextResponse.json({
        success: false,
        error: 'filePath is required'
      }, { status: 400 });
    }

    const format = body.format || 'sql';
    
    if (!['sql', 'json', 'csv'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid format. Use sql, json, or csv.'
      }, { status: 400 });
    }

    const result = await databaseManager.import({
      filePath: body.filePath,
      format: format as 'sql' | 'json' | 'csv',
      truncate: body.truncate || false,
      tables: body.tables
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          records: result.records
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
    console.error('Import database error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
