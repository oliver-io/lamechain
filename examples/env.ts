import { config } from 'dotenv';
import fs from 'fs';
console.log(fs.readdirSync('../', 'utf8'));
config({ path: '.dev.env' });