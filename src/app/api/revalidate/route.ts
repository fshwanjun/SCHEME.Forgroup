import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// 모든 관련 경로를 revalidate하는 API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, tag, type = 'page' } = body;

    // 특정 경로 revalidate
    if (path) {
      revalidatePath(path, type as 'page' | 'layout');
      return NextResponse.json({ 
        revalidated: true, 
        path,
        now: Date.now() 
      });
    }

    // 특정 태그 revalidate
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ 
        revalidated: true, 
        tag,
        now: Date.now() 
      });
    }

    // path나 tag가 없으면 모든 주요 경로 revalidate
    revalidatePath('/', 'layout');
    revalidatePath('/projects', 'page');
    revalidatePath('/studio', 'page');
    
    return NextResponse.json({ 
      revalidated: true, 
      message: 'All paths revalidated',
      now: Date.now() 
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { revalidated: false, error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}

// GET 요청도 지원 (쉬운 테스트용)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  try {
    if (path) {
      revalidatePath(path);
      return NextResponse.json({ 
        revalidated: true, 
        path,
        now: Date.now() 
      });
    }

    // path가 없으면 모든 주요 경로 revalidate
    revalidatePath('/', 'layout');
    revalidatePath('/projects', 'page');
    revalidatePath('/studio', 'page');
    
    return NextResponse.json({ 
      revalidated: true, 
      message: 'All paths revalidated',
      now: Date.now() 
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { revalidated: false, error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}
