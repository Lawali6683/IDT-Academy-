import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://orhgklhfltsfdumrrhup.supabase.co'
const supabaseKey = 'sb_publishable_8EdSv3j9kxRkIJP7XfSppg_gfBGSkKV'

export const supabase = createClient(supabaseUrl, supabaseKey)



