import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

export async function GET(request: NextRequest) {
    try {
        // Check if Supabase is configured
        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials not configured');
            return NextResponse.json(
                { detail: 'Serviço de autenticação não configurado' },
                { status: 503 }
            );
        }

        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { detail: 'Token não fornecido' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token
        const secret = new TextEncoder().encode(jwtSecret);
        let payload;
        try {
            const { payload: verifiedPayload } = await jwtVerify(token, secret);
            payload = verifiedPayload;
        } catch (err) {
            return NextResponse.json(
                { detail: 'Token inválido ou expirado' },
                { status: 401 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, is_active, created_at')
            .eq('id', payload.sub)
            .single();

        if (!user || error) {
            return NextResponse.json(
                { detail: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error: any) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { detail: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
