import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

async function getUserId(request: NextRequest): Promise<number | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(authHeader.split(' ')[1], secret);
        return parseInt(payload.sub as string, 10);
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ detail: 'Não autorizado' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let query = supabase
            .from('pf_categories')
            .select('*')
            .or(`user_id.eq.${userId},user_id.is.null`)
            .order('name');

        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Categories error:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json({ detail: 'Não autorizado' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const body = await request.json();

        const { data, error } = await supabase
            .from('pf_categories')
            .insert([{ user_id: userId, ...body }])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ detail: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ detail: 'Erro interno' }, { status: 500 });
    }
}
