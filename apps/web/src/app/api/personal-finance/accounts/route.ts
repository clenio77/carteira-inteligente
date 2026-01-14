import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

async function getUserFromToken(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jwtVerify(token, secret);
        return parseInt(payload.sub as string, 10);
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { detail: 'Serviço não configurado' },
                { status: 503 }
            );
        }

        const userId = await getUserFromToken(request);
        if (!userId) {
            return NextResponse.json(
                { detail: 'Não autorizado' },
                { status: 401 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: accounts, error } = await supabase
            .from('pf_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('name');

        if (error) {
            console.error('Query error:', error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(accounts || []);
    } catch (error: any) {
        console.error('Accounts error:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { detail: 'Serviço não configurado' },
                { status: 503 }
            );
        }

        const userId = await getUserFromToken(request);
        if (!userId) {
            return NextResponse.json(
                { detail: 'Não autorizado' },
                { status: 401 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const body = await request.json();

        const { name, type, balance, color } = body;

        if (!name || !type) {
            return NextResponse.json(
                { detail: 'Nome e tipo são obrigatórios' },
                { status: 400 }
            );
        }

        const { data: account, error } = await supabase
            .from('pf_accounts')
            .insert([{
                user_id: userId,
                name,
                type,
                balance: balance || 0,
                color
            }])
            .select()
            .single();

        if (error) {
            console.error('Insert error:', error);
            return NextResponse.json(
                { detail: 'Erro ao criar conta' },
                { status: 500 }
            );
        }

        return NextResponse.json(account, { status: 201 });
    } catch (error: any) {
        console.error('Create account error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
