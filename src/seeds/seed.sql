-- Seed data for Sale Management App

-- Insert categories
INSERT INTO category (id, name, description) VALUES
  (1, 'Electronics', 'Electronic devices'),
  (2, 'Books', 'Various books'),
  (3, 'Clothing', 'Apparel and accessories')
ON CONFLICT (id) DO NOTHING;

-- Insert products
INSERT INTO product (id, name, description, category_id, price) VALUES
  (1, 'Smartphone', 'Latest model smartphone', 1, 699.99),
  (2, 'Laptop', 'High performance laptop', 1, 1299.99),
  (3, 'Novel', 'Bestselling novel', 2, 19.99),
  (4, 'T-Shirt', '100% cotton t-shirt', 3, 9.99)
ON CONFLICT (id) DO NOTHING;

-- Insert orders
INSERT INTO "order" (id, customer_name, order_date) VALUES
  (1, 'Alice', '2024-06-01'),
  (2, 'Bob', '2024-06-02')
ON CONFLICT (id) DO NOTHING;

-- Insert order items
INSERT INTO order_item (id, order_id, product_id, quantity, price) VALUES
  (1, 1, 1, 1, 699.99),
  (2, 1, 3, 2, 19.99),
  (3, 2, 2, 1, 1299.99),
  (4, 2, 4, 3, 9.99)
ON CONFLICT (id) DO NOTHING;