import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.join(__dirname, '../../', '.env'); // Adjust path based on where .env is located
dotenv.config({ path: envPath });

