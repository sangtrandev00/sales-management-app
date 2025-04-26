import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function seed() {
  try {
    await client.connect();
    // Insert categories
    await client.query(`INSERT INTO category (id, name, description) VALUES
      (1, 'Electronics', 'Electronic devices'),
      (2, 'Books', 'Various books'),
      (3, 'Clothing', 'Apparel and accessories')
      ON CONFLICT (id) DO NOTHING;
    `);
    // Insert products
    await client.query(`INSERT INTO product (id, name, description, category_id, price) VALUES
      (1, 'Smartphone', 'Latest model smartphone', 1, 699.99),
      (2, 'Laptop', 'High performance laptop', 1, 1299.99),
      (3, 'Novel', 'Bestselling novel', 2, 19.99),
      (4, 'T-Shirt', '100% cotton t-shirt', 3, 9.99)
      ON CONFLICT (id) DO NOTHING;
    `);
    // Insert orders
    await client.query(`INSERT INTO "order" (id, customer_name, order_date) VALUES
      (1, 'Alice', '2024-06-01'),
      (2, 'Bob', '2024-06-02')
      ON CONFLICT (id) DO NOTHING;
    `);
    // Insert order items
    await client.query(`INSERT INTO order_item (id, order_id, product_id, quantity, price) VALUES
      (1, 1, 1, 1, 699.99),
      (2, 1, 3, 2, 19.99),
      (3, 2, 2, 1, 1299.99),
      (4, 2, 4, 3, 9.99)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Mock data inserted successfully.');
  } catch (err) {
    console.error('Error inserting mock data:', err);
  } finally {
    await client.end();
  }
}

seed();
