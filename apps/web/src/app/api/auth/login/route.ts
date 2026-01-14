import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const jwtSecret = process.env.SECRET_KEY || 'development-secret-key';

export async function POST(request: NextRequest) {
    try {
        // Check if Supabase is configured
        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials not configured');
            return NextResponse.json(
                { detail: 'Serviço de autenticação não configurado. Entre em contato com o suporte.' },
                { status: 503 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await request.json();
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { detail: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Find user
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id, email, hashed_password, is_active')
            .eq('email', email)
            .single();

        if (!user || findError) {
            return NextResponse.json(
                { detail: 'Email ou senha incorretos' },
                { status: 401 }
            );
        }

        // Check if user is active
        if (!user.is_active) {
            return NextResponse.json(
                { detail: 'Usuário inativo' },
                { status: 403 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.hashed_password);
        if (!isValidPassword) {
            return NextResponse.json(
                { detail: 'Email ou senha incorretos' },
                { status: 401 }
            );
        }

        // Create JWT token
        const secret = new TextEncoder().encode(jwtSecret);
        const token = await new SignJWT({ sub: String(user.id), email: user.email })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('30m')
            .sign(secret);

        return NextResponse.json({
            access_token: token,
            token_type: 'bearer'
        });
    } catch (error: any) {
        console.error('Login error:', error);
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
