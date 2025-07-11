import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSessionAndValidate } from '@/lib/api-auth';

export async function POST(request: Request): Promise<NextResponse> {
  const validation = await getSessionAndValidate();
  if (!validation.isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'No filename or body found.' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Error uploading file', details: error.message }, { status: 500 });
  }
} 