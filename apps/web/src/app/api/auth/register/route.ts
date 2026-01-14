import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

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

        if (password.length < 8) {
            return NextResponse.json(
                { detail: 'A senha deve ter no mínimo 8 caracteres' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { detail: 'Email já cadastrado' },
                { status: 400 }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    email,
                    hashed_password: hashedPassword,
                    is_active: true,
                    is_superuser: false,
                }
            ])
            .select('id, email, is_active, created_at')
            .single();

        if (insertError) {
            console.error('Error creating user:', insertError);
            return NextResponse.json(
                { detail: 'Erro ao criar conta. Tente novamente.' },
                { status: 500 }
            );
        }

        return NextResponse.json(newUser, { status: 201 });
    } catch (error: any) {
        console.error('Register error:', error);
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
