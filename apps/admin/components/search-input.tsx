'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/input';

export function SearchInput({ placeholder = 'Search…', paramName = 'q' }: { placeholder?: string; paramName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set(paramName, e.target.value);
    } else {
      params.delete(paramName);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <Input
        className={`pl-9 transition-opacity ${isPending ? 'opacity-60' : ''}`}
        placeholder={placeholder}
        defaultValue={searchParams.get(paramName) ?? ''}
        onChange={handleChange}
      />
    </div>
  );
}
