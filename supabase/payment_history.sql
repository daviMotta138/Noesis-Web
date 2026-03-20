-- Create a table to track payments/purchases
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    pack_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    nous_earned INTEGER NOT NULL,
    mp_preference_id TEXT,
    mp_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
    ON public.payment_history FOR SELECT
    USING (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admins can view all payment history"
    ON public.payment_history FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_history_updated_at
    BEFORE UPDATE ON public.payment_history
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
