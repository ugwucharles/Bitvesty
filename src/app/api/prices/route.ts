import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 10 } // Optional caching to prevent rate limits
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from CoinGecko' }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching prices proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
