/**
 * Delete Backup API
 * DELETE: Delete a specific backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { databaseManager } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await databaseManager.deleteBackup(id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Delete backup error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
