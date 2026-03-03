import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Call the PL/pgSQL function to process promotions/demotions
    const result = await supabase.rpc('check_league_promotions');

    if (result.error) {
      console.error('Error processing promotions:', result.error);
      return res.status(500).json({ error: result.error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'League promotions and demotions processed successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
