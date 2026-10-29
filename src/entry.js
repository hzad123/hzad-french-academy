import {createClient} from '@supabase/supabase-js';
import {mountAcademy} from './main.js';
const host=document.getElementById('hzad-academy-host');
if(host)mountAcademy(host,createClient);
