/**
 * 캐시 무효화 유틸리티 함수
 * 어드민에서 데이터 저장 후 호출하여 캐시된 페이지를 갱신
 */

// 특정 경로 revalidate
export async function revalidatePath(path: string): Promise<boolean> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });
    
    const data = await response.json();
    return data.revalidated === true;
  } catch (error) {
    console.error('Failed to revalidate path:', path, error);
    return false;
  }
}

// 모든 주요 경로 revalidate
export async function revalidateAll(): Promise<boolean> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    return data.revalidated === true;
  } catch (error) {
    console.error('Failed to revalidate all paths:', error);
    return false;
  }
}

// 프로젝트 관련 경로 revalidate
export async function revalidateProjects(slug?: string): Promise<boolean> {
  try {
    // 프로젝트 목록 페이지 revalidate
    await revalidatePath('/projects');
    
    // 특정 프로젝트 상세 페이지 revalidate
    if (slug) {
      await revalidatePath(`/projects/${slug}`);
    }
    
    // 홈페이지도 revalidate (프로젝트 이미지가 표시될 수 있음)
    await revalidatePath('/');
    
    return true;
  } catch (error) {
    console.error('Failed to revalidate projects:', error);
    return false;
  }
}

// 스튜디오 페이지 revalidate
export async function revalidateStudio(): Promise<boolean> {
  return revalidatePath('/studio');
}

// 랜딩 페이지 revalidate
export async function revalidateLanding(): Promise<boolean> {
  return revalidatePath('/');
}
