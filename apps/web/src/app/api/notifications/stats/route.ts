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

        // Check if table exists first by trying a simple query
        // If notifications table doesn't exist or is different, just return 0s
        try {
            const { count: total, error: totalError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (totalError) throw totalError;

            const { count: unread } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            const totalCount = total || 0;
            const unreadCount = unread || 0;

            return NextResponse.json({
                total: totalCount,
                unread: unreadCount,
                read: totalCount - unreadCount
            });

        } catch (error) {
            console.warn('Notifications table check failed, returning zeros', error);
            return NextResponse.json({
                total: 0,
                unread: 0,
                read: 0
            });
        }
    } catch (error) {
        console.error('Notifications stats error:', error);
        return NextResponse.json({
            total: 0,
            unread: 0,
            read: 0
        });
    }
}
