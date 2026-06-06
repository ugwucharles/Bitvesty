import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { SeedUser, seedDefaultUsers } from '@/lib/defaultUsers';

const dataFile = path.join(process.cwd(), 'data', 'users.json');
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function ensureDataFile(): Promise<SeedUser[]> {
  try {
    await fs.access(dataFile);
    const data = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed as SeedUser[];
  } catch {
    // If the file doesn't exist, seed it with default users
    const dir = path.dirname(dataFile);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
    
    const seeded = seedDefaultUsers([]);
    await fs.writeFile(dataFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }
}

export async function GET() {
  try {
    const users = await ensureDataFile();
    return NextResponse.json(users, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const users: SeedUser[] = await request.json();
    const dir = path.dirname(dataFile);
    
    // Ensure directory exists before writing
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(dataFile, JSON.stringify(users, null, 2));
    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error("Error saving users:", error);
    return NextResponse.json({ error: "Failed to save users" }, { status: 500 });
  }
}
